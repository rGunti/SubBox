import { Schema$ThumbnailDetails, Schema$Subscription } from "googleapis/build/src/apis/youtube/v3";

/**
 * Represents an image displayed on YouTube
 * e.g. a video thumbnail, channel icon, etc.
 */
export class ThumbnailDTO {
    public default:string;
    public medium:string;
    public high:string;
    public maxres:string;
    public standard:string;

    /**
     * Gets a new Thumbnail DTO from a Thumbnail Detail Object
     * retrieved from the YouTube Data API
     * @param s 
     */
    public static convertFromYouTube(s:Schema$ThumbnailDetails):ThumbnailDTO {
        const t = new ThumbnailDTO();
        t.default = s.default ? s.default.url : null;
        t.medium = s.medium ? s.medium.url : null;
        t.high = s.high ? s.high.url : null;
        t.maxres = s.maxres ? s.maxres.url : null;
        t.standard = s.standard ? s.standard.url : null;
        return t;
    }
}

/**
 * Represents a YouTube channel
 */
export class YouTubeChannelDTO {
    public id:string;
    public name:string;
    public channelIcon?:ThumbnailDTO;

    /**
     * Gets a new YouTube Channel DTO from a Subscription item
     * retrieved from the YouTube Data API
     * @param s Subscription item from YouTube Data API
     */
    public static convertFromSubscription(s:Schema$Subscription):YouTubeChannelDTO {
        const c = new YouTubeChannelDTO();
        c.id = s.snippet.resourceId.channelId;
        c.name = s.snippet.title;
        c.channelIcon = ThumbnailDTO.convertFromYouTube(s.snippet.thumbnails);
        return c;
    }
}

export class ObjectListSection<T> {
    constructor(items:T[], nextPageToken?:string) {
        this.items = items;
        this.nextPageToken = nextPageToken || null;
    }

    public nextPageToken?:string;
    public items:T[];
}

export class YouTubeChannelListSection extends ObjectListSection<YouTubeChannelDTO> { }
