import { Router, Request, Response, RouterOptions, NextFunction } from "express";
import { authError, emptyResponse, restError, dataResponse, nextTick } from "./utils";
import * as config from "config";
import { OAuth2Client } from 'google-auth-library';
import * as google from "googleapis";
import { AxiosResponse } from "axios";
import { Schema$SubscriptionListResponse } from "googleapis/build/src/apis/youtube/v3";
import { YouTubeChannelDTO, YouTubeChannelListSection } from "../dtos/youtube";
import { DataCollectionResponseDTO } from "../dtos/base";

const router:Router = Router();

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

interface YouTubeAuthRequest extends Request {
    youtubeCredentials:YouTubeCredentials;
}

/**
 * Checks if authentication is present.
 * If so, continue.
 * If not, respond with 403 Not Authenticated.
 * @param req 
 * @param res 
 * @param next 
 */
const youtubeAuth = (req:YouTubeAuthRequest, res:Response, next:NextFunction) => {
    if (req.query && req.query.accessToken && req.query.refreshToken) {
        req.youtubeCredentials = new YouTubeCredentials(req.query.accessToken, req.query.refreshToken);
        return next();
    }
    return authError(req, res, 'AUTH_YOUTUBE_MISSING');
};

router.get('/', emptyResponse(false));

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

export const YouTubeRouter: Router = router;