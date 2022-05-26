import * as Mongoose from "mongoose";
import { IDocumentBase } from "../../interfaces/baseSchema";

export interface IAccountingSoftware extends IDocumentBase {
    name: string;
}

export const AccountingSoftwareSchema = new Mongoose.Schema(
    {
        name: {type: String, required: true},
        //BASE SCHEMA
        deleted: { type: Boolean, default: false, select: false },
        createdAt: { type: Date, select: false},
        updatedAt: { type: Date, select: false },
        __v: { type: Number, select: false }
    },
    {
        timestamps: true
    }
);

export const AccountingSoftwareModel = Mongoose.model<IAccountingSoftware>('AccountingSoftware', AccountingSoftwareSchema);