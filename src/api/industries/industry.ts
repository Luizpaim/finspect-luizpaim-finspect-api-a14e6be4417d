import * as Mongoose from "mongoose";
import { IDocumentBase } from "../../interfaces/baseSchema";

export interface IIndustry extends IDocumentBase {
    name: string;
    description: string;
}

export const IndustrySchema = new Mongoose.Schema(
    {
        name: {type: String, required: true},
        description: String,
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

export const IndustryModel = Mongoose.model<IIndustry>('Industry', IndustrySchema);