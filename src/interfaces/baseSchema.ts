import * as Mongoose from "mongoose";

export interface IDocumentBase extends Mongoose.Document {
    deleted?: boolean;
    createdAt?: Date;
    updateAt?: Date;
}