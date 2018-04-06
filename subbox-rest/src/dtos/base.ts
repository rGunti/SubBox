export class EmptyDataResponseDTO {
    constructor(okay:boolean = true) {
        this.okay = okay;
    }

    public okay:boolean;
}

export class DataResponseDTO<T> extends EmptyDataResponseDTO {
    constructor(data:T) {
        super();
        this.data = data;
    }

    public data:T;
}

export class DataCollectionResponseDTO<T> extends DataResponseDTO<T[]> {
    constructor(collection:T[]) {
        super(collection);
        this.itemCount = collection.length;
    }

    public readonly itemCount:number;
}

export class ErrorResponseDTO extends EmptyDataResponseDTO {
    constructor(error:Error|ErrorDTO) {
        super(false);
        this.error = error;
    }

    public error:Error|ErrorDTO;
}

export interface ErrorDTO {}
