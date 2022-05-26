import * as Mongoose from "mongoose";

export interface ISession extends Mongoose.Document {
    userId: string;
    timestamp: number;
    platform: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export const SessionSchema = new Mongoose.Schema(
    {
      userId: { type: String, required: true },
      timestamp: { type: Number, required: true },
      platform: { type: String },
      isActive: { type: Boolean, default: true}
    },
    {
      timestamps: true
    }
);

export const SessionModel = Mongoose.model<ISession>('Session', SessionSchema);