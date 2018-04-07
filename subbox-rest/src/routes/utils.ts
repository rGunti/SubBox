import { Request, Response, NextFunction } from "express";
import { DataCollectionResponseDTO, DataResponseDTO } from "../dtos/base";

export function nextTick(req:Request, res:Response, next:NextFunction) {
    process.nextTick(() => next());
}

export function authError(req:Request, res:Response, reason:string = 'AUTH_GENERAL') {
    res.status(403).json({
        okay: false,
        error: reason
    });
}

function processError(error:Error|any):Error|any {
    if (error.request) delete error.request;
    if (error.response) delete error.response;
    if (error.config) delete error.config;
    return error;
}

export function restError(error:Error|any, reason:string = 'ERR_UNSPECIFIED', errorStatus:number = 500) {
    return (req:Request, res:Response) => {
        res.status(errorStatus).json({
            okay: false,
            error: reason,
            detail: processError(error)
        });
    };
};

export function emptyResponse(content:boolean = true) {
    return (req:Request, res:Response) => {
        if (content) {
            res.status(200).json({ okay: true });
        } else {
            res.status(204).end();
        }
    };
};

export function dataResponse(data:DataResponseDTO<any>) {
    return (req:Request, res:Response) => {
        res.json(data);
    };
}

export function dataCollectionResponse(data:DataCollectionResponseDTO<any>) {
    return (req:Request, res:Response) => {
        res.json(data);
    };
};
