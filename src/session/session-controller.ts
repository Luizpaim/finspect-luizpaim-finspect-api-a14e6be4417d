import { ISession } from './session';
import { IDatabase } from '../database';
import { IServerConfigurations } from "../configurations";
import { ICredentials } from "../interfaces/request";

export default class SessionController {
    private database: IDatabase;
    private configs: IServerConfigurations;

    constructor(configs: IServerConfigurations, database: IDatabase) {
        this.database = database;
        this.configs = configs;
    }

    public async createSession (userId: string, timestamp: number, platform: string) {
        let newSession : ISession = <ISession> {userId, timestamp, platform};
        try {
            let session = await this.database.sessionModel.create(newSession);
            return session;
        } catch (error) {
            throw new Error(error);
        }
    }

    public async invalidateSession (credentials: ICredentials) {
        try {
            let session : ISession = await this.database.sessionModel.findOneAndUpdate({userId: credentials.id, timestamp: credentials.iat}, {$set: {isActive: false}});
            return session;
        } catch (error) {
            throw new Error(error);
        }
    }

    public async verifySession (credentials: ICredentials) {
        try {
            let session : ISession = await this.database.sessionModel.findOne({userId: credentials.id, timestamp: credentials.iat, isActive: true});
            return session != null;
        } catch (error) {
            throw new Error(error);
        }
    }
}