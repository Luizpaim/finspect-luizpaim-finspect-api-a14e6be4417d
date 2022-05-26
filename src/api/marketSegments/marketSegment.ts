import * as Mongoose from "mongoose";
import { IDocumentBase } from "../../interfaces/baseSchema";

export interface IMarketSegment extends IDocumentBase {
    industryId: string;
    name: string;
    description: string;
}

export const MarketSegmentSchema = new Mongoose.Schema(
    {
        industryId: Mongoose.Schema.Types.ObjectId,
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

export const MarketSegmentModel = Mongoose.model<IMarketSegment>('MarketSegment', MarketSegmentSchema);