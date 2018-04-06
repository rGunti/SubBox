import { Router, Request, Response, RouterOptions, NextFunction } from "express";
import { authError, emptyResponse, restError, dataResponse, nextTick } from "./utils";
import * as config from "config";
import { OAuth2Client } from 'google-auth-library';
import * as google from "googleapis";
import { AxiosResponse } from "axios";
import { Schema$SubscriptionListResponse } from "googleapis/build/src/apis/youtube/v3";
import { YouTubeChannelDTO, YouTubeChannelListSection } from "../dtos/youtube";
import { DataCollectionResponseDTO } from "../dtos/base";

/* ---- CLASSES & INTERFACES ---- */

/**
 * Construct which contains the Access and Refresh Tokens
 * for YouTube authentication as well as an OAuth2Client
 * by Google
 */
class YouTubeCredentials {
    /** Users Access Token */
    public readonly AccessToken:string;
    /** Users Refresh Token */
    public readonly RefreshToken:string;

    /** Google OAuth2Client with credentials prefilled for use */
    public readonly OAuthClient:OAuth2Client;

    constructor(accessToken:string, refreshToken:string) {
        this.AccessToken = accessToken;
        this.RefreshToken = refreshToken;

        const client = new OAuth2Client(
            config.get('youtube.credentials.clientID'),
            config.get('youtube.credentials.clientSecret')
        );
        client.credentials = {
            access_token: this.AccessToken,
            refresh_token: this.RefreshToken
        };
        this.OAuthClient = client;
    }
}

/** Internal Interface to extend express Request with YouTube Credentials */
interface YouTubeAuthRequest extends Request {
    youtubeCredentials:YouTubeCredentials;
}

/* ---- PROCESSING FUNCTIONS ---- */

/**
 * Checks if authentication is present.
 * If so, continue.
 * If not, respond with 403 Not Authenticated.
 * 
 * This method DOES NOT check for the validity of the given credentials.
 * It only checks the presence.
 * 
 * This function is a request handler that can be used in a router that 
 * requires YouTube Authentication. It requires the following two query parameters
 * to be present:
 * 
 * {youtubeAuth}
 * - accessToken: Contains the OAuth Access Token to access account information
 * - refreshToken: Contains the OAuth Refresh Token to access account information
 * 
 * Upon success, a property is added to the Request object that contains the given
 * credentials and a newly created OAuth2Client (by Google) ready for requests.
 * You can access this property by using "req.youtubeCredentials".
 * 
 * @param req Request (express)
 * @param res Response (express)
 * @param next Next Function to execute then successful (express)
 */
const youtubeAuth = (req:YouTubeAuthRequest, res:Response, next:NextFunction) => {
    if (req.query && req.query.accessToken && req.query.refreshToken) {
        req.youtubeCredentials = new YouTubeCredentials(req.query.accessToken, req.query.refreshToken);
        return next();
    }
    return authError(req, res, 'AUTH_YOUTUBE_MISSING');
};

/**
 * Fetches a page of YouTube channels the authenticated user subscribed to
 * @param oauthClient OAuth Client with User credentials
 * @param nextPageToken if available, the token to retrieve the next page
 */
function fetchSubscriptionPage(oauthClient:OAuth2Client, nextPageToken:string = null):Promise<YouTubeChannelListSection> {
    return new Promise<YouTubeChannelListSection>((resolve, reject) => {
        process.nextTick(() => {
            google.google.youtube({
                version: 'v3',
                auth: oauthClient
            }).subscriptions.list({
                part: 'snippet',
                pageToken: nextPageToken,
                mine: true,
                maxResults: 50,
                order: 'alphabetical',
                fields: 'etag,eventId,items(snippet(resourceId(channelId,playlistId,videoId),thumbnails,title)),nextPageToken,pageInfo,prevPageToken'
            }, (err:Error|null, data:AxiosResponse<Schema$SubscriptionListResponse>) => {
                if (err) reject(err);
                resolve(new YouTubeChannelListSection(
                    data.data.items.map(s => YouTubeChannelDTO.convertFromSubscription(s)),
                    data.data.nextPageToken
                ));
            });
        });
    });
}

/**
 * Fetches a list of all YouTube channels a user has subscribed to
 * @param oauthClient OAuth Client with User credentials
 */
function fetchAllSubscriptions(oauthClient:OAuth2Client):Promise<YouTubeChannelDTO[]> {
    return new Promise<YouTubeChannelDTO[]>(async (resolve, reject) => {
        const result:YouTubeChannelDTO[] = [];
        let lastResponse:YouTubeChannelListSection = new YouTubeChannelListSection(null);
        try {
            do {
                lastResponse = await fetchSubscriptionPage(oauthClient, lastResponse.nextPageToken);
                lastResponse.items.forEach(c => result.push(c));
            } while (lastResponse.nextPageToken);
        } catch (err) {
            reject(err);
        }
        resolve(result);
    });
}

/* ---- ROUTER ---- */

const router:Router = Router();

/** 
 * GET _/
 * Default Route (responds with 204 Empty Response to confirm that this router is loaded and working)
 * 
 * Returns:
 *  HTTP 204 No Content
 */
router.get('/', emptyResponse(false));

/**
 * GET _/subscriptions
 * Retrieves a list of channels the authenticated user has subscribed to
 * 
 * Parameters (Query):
 *  -> {youtubeAuth}
 * 
 * Returns:
 *  if successful:
 *      {
 *          okay: true                  => true
 *          data: YouTubeChannelDTO[]   => Array of subscribed YouTube Channels
 *          itemCount: number           => Number of items present in "data"
 *      }
 *  if failed:
 *      {
 *          okay: false                 => false
 *          error: string               => Error Reason Code ("ERR_UNSPECIFIED")
 *          detail: Error|any           => Error object that was thrown
 *      }
 */
router.get('/subscriptions', youtubeAuth, nextTick, (req:YouTubeAuthRequest, res:Response) => {
    fetchAllSubscriptions(req.youtubeCredentials.OAuthClient)
        .then((channels) => {
            return dataResponse(
                new DataCollectionResponseDTO<YouTubeChannelDTO>(channels)
            )(req, res);
        })
        .catch((err) => {
            return restError(err)(req, res);
        });
});

/* ---- ROUTER EXPORT (END OF FILE) ---- */
export const YouTubeRouter: Router = router;