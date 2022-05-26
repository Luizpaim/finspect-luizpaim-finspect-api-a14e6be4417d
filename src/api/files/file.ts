import * as Mongoose from "mongoose";
import { IDocumentBase } from "../../interfaces/baseSchema";

export interface IFile extends IDocumentBase {
    accountantId: string;
    companyId: string;
    filename: string;
    originalFilename: string;
    extension: string;
    type: string; //reports, balancesheets, excel, other files
    url: string;
    size: number;
    info: object;
}

export const FileSchema = new Mongoose.Schema(
    {
        companyId: { type: Mongoose.Schema.Types.ObjectId, required: true },
        accountantId: { type: Mongoose.Schema.Types.ObjectId, required: true },
        filename: { type: String, required: true },
        originalFilename: { type: String, required: true },
        extension: { type: String, required: true },
        type: String,
        url: { type: String, required: true },
        size: { type: Number, required: true },
        info: Object,
        //BASE SCHEMA
        deleted: { type: Boolean, default: false, select: false },
        createdAt: { type: Date },
        updatedAt: { type: Date, select: false },
        __v: { type: Number, select: false }
    },
    {
        timestamps: true
    }
);

export const FileModel = Mongoose.model<IFile>("File", FileSchema);