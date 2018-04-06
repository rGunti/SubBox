import { Router, Request, Response, RouterOptions, NextFunction } from "express";
import { authError, emptyResponse, restError, dataResponse, nextTick } from "./utils";
import * as config from "config";
import { OAuth2Client } from 'google-auth-library';
import * as google from "googleapis";
import { AxiosResponse } from "axios";
import { Schema$SubscriptionListResponse } from "googleapis/build/src/apis/youtube/v3";
import { YouTubeChannelDTO } from "../dtos/youtube";

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

//function fetchSubscriptionPage(oauthClient:OAuth2Client, nextPageToken:string = null) {
//    google.google.youtube({
//        version: 'v3',
//        auth: oauthClient
//    }).subscriptions.list({
//        part: 'snippet',
//        mine: true,
//        maxResults: 50,
//        order: 'alphabetical',
//        fields: 'etag,eventId,items(snippet(resourceId(channelId,playlistId,videoId),thumbnails,title)),nextPageToken,pageInfo,prevPageToken'
//    }, (err:Error|null, data:AxiosResponse<Schema$SubscriptionListResponse>) => {
//        if (err) {
//            console.log(err.constructor.name, err.name, err.message);
//            return restError(err, 'ERR_REMOTE_API')(req, res);
//        }
//        if (data && data.data) {
//            return dataResponse(data.data)(req, res);
//        } else {
//            return restError(null, 'ERR_EMPTY_RESPONSE')(req, res);
//        }
//    });
//}

router.get('/subscriptions', youtubeAuth, nextTick, (req:YouTubeAuthRequest, res:Response) => {
    google.google.youtube({
        version: 'v3',
        auth: req.youtubeCredentials.OAuthClient
    }).subscriptions.list({
        part: 'snippet',
        mine: true,
        maxResults: 50,
        order: 'alphabetical',
        fields: 'etag,eventId,items(snippet(resourceId(channelId,playlistId,videoId),thumbnails,title)),nextPageToken,pageInfo,prevPageToken'
    }, (err:Error|null, data:AxiosResponse<Schema$SubscriptionListResponse>) => {
        if (err) {
            console.log(err.constructor.name, err.name, err.message);
            return restError(err, 'ERR_REMOTE_API')(req, res);
        }
        if (data && data.data) {
            return dataResponse(
                data.data.items.map(s => YouTubeChannelDTO.convertFromSubscription(s))
            )(req, res);
        } else {
            return restError(null, 'ERR_EMPTY_RESPONSE')(req, res);
        }
    });
});

export const YouTubeRouter: Router = router;