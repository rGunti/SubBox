import { Router, Request, Response, RouterOptions, NextFunction } from "express";
import { authError, emptyResponse, restError, dataResponse, dataCollectionResponse, nextTick } from "./utils";
import * as config from "config";
import { OAuth2Client } from 'google-auth-library';
import * as google from "googleapis";
import { AxiosResponse } from "axios";
import { Schema$SubscriptionListResponse, Schema$ChannelListResponse } from "googleapis/build/src/apis/youtube/v3";
import { YouTubeChannelDTO, YouTubeChannelListSection, YouTubeVideoDTO, ObjectListSection } from "../dtos/youtube";
import { DataCollectionResponseDTO, DataResponseDTO } from "../dtos/base";
import * as async from "async";

/* ---- CONSTANTS / CONFIG VALUES ---- */
const YOUTUBE_API_KEY:string = config.get('youtube.credentials.apiKey');
const YOUTUBE_OAUTH_CLIENT_ID:string = config.get('youtube.credentials.clientID');
const YOUTUBE_OAUTH_CLIENT_SECRET:string = config.get('youtube.credentials.clientSecret');

const MAX_SUBSCRIPTIONS:number = config.get('logic.maxSubscriptions');

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

        const client = getNewOAuthClient();
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
 * Returns a new OAuth2Client with the right credentials
 */
const getNewOAuthClient = () => {
    return new OAuth2Client(YOUTUBE_OAUTH_CLIENT_ID, YOUTUBE_OAUTH_CLIENT_SECRET);
};

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
 * Note: The maximum number of items that can be fetched through this method is a
 * configurable value. If the user exceeds the number of subscriptions that is configured
 * this method will only deliver the first XXX channels a user has subscribed to.
 * @param oauthClient OAuth Client with User credentials
 */
function fetchAllSubscriptions(oauthClient:OAuth2Client):Promise<YouTubeChannelDTO[]> {
    return new Promise<YouTubeChannelDTO[]>(async (resolve, reject) => {
        const result:YouTubeChannelDTO[] = [];
        let lastResponse:YouTubeChannelListSection = new YouTubeChannelListSection(null);
        try {
            let remainingInterations = Math.ceil(MAX_SUBSCRIPTIONS / 50);
            do {
                remainingInterations--;
                lastResponse = await fetchSubscriptionPage(oauthClient, lastResponse.nextPageToken);
                lastResponse.items.forEach(c => result.push(c));
            } while (lastResponse.nextPageToken && remainingInterations > 0);
        } catch (err) {
            reject(err);
        }
        resolve(result);
    });
}

/**
 * Retrieves YouTube Channel info about a given channel 
 * @param channelID YouTube Channel ID
 */
function fetchChannel(channelID:string):Promise<YouTubeChannelDTO> {
    return new Promise<YouTubeChannelDTO>((resolve, reject) => {
        process.nextTick(() => {
            google.google.youtube({
                version: 'v3'
            }).channels.list({
                key: YOUTUBE_API_KEY,
                part: 'snippet,contentDetails',
                id: channelID,
                fields: 'items(contentDetails/relatedPlaylists/uploads,id,snippet(customUrl,thumbnails,title))'
            }, (err:Error|any, data:AxiosResponse<Schema$ChannelListResponse>) => {
                if (!err && data.data && data.data.items.length >= 1) {
                    resolve(
                        YouTubeChannelDTO.convertFromChannelList(data.data.items[0])
                    );
                } else {
                    reject(err);
                }
            });
        });
    });
}

/**
 * Retrieves a list of (max. 50) videos in a given playlist by ID
 * @param playlistID YouTube Playlist ID
 */
function fetchPlaylistItems(playlistID:string, nextPageToken:string = null):Promise<ObjectListSection<YouTubeVideoDTO>> {
    return new Promise<ObjectListSection<YouTubeVideoDTO>>((resolve, reject) => {
        process.nextTick(() => {
            google.google.youtube({
                version: 'v3'
            }).playlistItems.list({
                key: YOUTUBE_API_KEY,
                part: 'snippet',
                playlistId: playlistID,
                maxResults: 50,
                pageToken: nextPageToken,
                fields: 'items(snippet(publishedAt,resourceId/videoId,thumbnails,title)),nextPageToken,prevPageToken'
            }, (err:Error|any, data) => {
                if (!err && data.data && data.data.items) {
                    resolve(
                        new ObjectListSection<YouTubeVideoDTO>(
                            data.data.items.map(v => YouTubeVideoDTO.convertFromPlaylistItem(v)),
                            data.data.nextPageToken
                        )
                    )
                } else {
                    reject(err);
                }
            });
        });
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
router.get('/subscriptions', youtubeAuth, nextTick, async (req:YouTubeAuthRequest, res:Response) => {
    try {
        const channels = await fetchAllSubscriptions(req.youtubeCredentials.OAuthClient);
        return dataCollectionResponse(
            new DataCollectionResponseDTO<YouTubeChannelDTO>(channels)
        )(req, res);
    } catch (err) {
        return restError(err)(req, res);
    }
});

/**
 * GET _/subscriptions/feed
 * ...
 * 
 * Parameters (Query):
 *  -> {youtubeAuth}
 */
router.get('/subscriptions/feed', youtubeAuth, nextTick, async (req:YouTubeAuthRequest, res:Response) => {
    try {
        const subscribedChannels = await fetchAllSubscriptions(req.youtubeCredentials.OAuthClient);
        let videos:YouTubeVideoDTO[] = [];
        async.eachOfLimit(subscribedChannels, 5, 
            async (channel:YouTubeChannelDTO, index:number, callback:(err?:Error|any) => void) => {
                try {
                    const channelDetail = await fetchChannel(channel.id);
                    const channelUploads = await fetchPlaylistItems(channelDetail.uploadPlaylistID);
                    channelUploads.items.forEach(v => {
                        v.uploadedBy = channelDetail;
                        videos.push(v);
                    });
                    callback();
                } catch (err) {
                    callback(err);
                }
            },
            (err:Error|null|any) => {
                if (err) return restError(err, 'ERR_FETCHING')(req, res);
                
                // Sort Data
                videos = videos.sort((a, b) => {
                    if (a.uploadedAt < b.uploadedAt) return 1;
                    else if (a.uploadedAt > b.uploadedAt) return -1;
                    return 0;
                }).splice(0, 100);

                // Send Data
                return dataCollectionResponse(new DataCollectionResponseDTO(videos))(req, res);
            }
        );
    } catch (err) {
        return restError(err)(req, res);
    }
});

/**
 * GET _/channel/{channelID}/info
 * Retrieves channel info from a given youtube channel
 * 
 * Parameters (Path):
 *  - channelID:    ID of YouTube channel
 * 
 * Returns:
 *  if successful:
 *      {
 *          okay: true                  => true
 *          data: YouTubeChannelDTO     => YouTube Channel Info
 *      }
 *  if failed:
 *      {
 *          okay: false                 => false
 *          error: string               => Error Reason Code ("ERR_UNSPECIFIED")
 *          detail: Error|any           => Error object that was thrown
 *      }
 */
router.get('/channel/:channelID/info', async (req:Request, res:Response) => {
    try {
        const channel = await fetchChannel(req.params.channelID);
        return dataResponse(
            new DataResponseDTO<YouTubeChannelDTO>(channel)
        )(req, res);
    } catch (err) {
        return restError(err)(req, res);
    }
});

/**
 * GET _/channel/{channelID}/videos
 * Retrieves uploaded videos from a given youtube channel
 * 
 * Parameters (Path):
 *  - channelID:    ID of YouTube channel
 * 
 * Returns:
 *  if successful:
 *      {
 *          okay: true                  => true
 *          data: YouTubeVideo[]        => List of (max. 50) YouTube videos
 *          itemCount: number           => Number of items present in "data"
 *      }
 *  if failed:
 *      {
 *          okay: false                 => false
 *          error: string               => Error Reason Code ("ERR_UNSPECIFIED")
 *          detail: Error|any           => Error object that was thrown
 *      }
 */
router.get('/channel/:channelID/videos', async (req:Request, res:Response) => {
    try {
        const channel = await fetchChannel(req.params.channelID);
        if (!channel) {
            return restError(null, 'ERR_YT_CHANNEL_MISSING', 404)(req, res);
        }
        const videos = await fetchPlaylistItems(channel.uploadPlaylistID);
        return dataCollectionResponse(
            new DataCollectionResponseDTO(videos.items)
        )(req, res);
    } catch (err) {
        restError(err)(req, res);
    }
});

/* ---- ROUTER EXPORT (END OF FILE) ---- */
export const YouTubeRouter: Router = router;