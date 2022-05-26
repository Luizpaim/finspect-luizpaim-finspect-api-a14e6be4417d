export interface IFileResult extends Object {
    filename: string;
    isError: boolean;
    error?: string;
    result?: object;
}