import * as Hapi from "hapi";
import * as Boom from "boom";
import * as Jwt from "jsonwebtoken";
import { IUser } from "./user";
import { IDatabase } from "../../database";
import { IServerConfigurations } from "../../configurations";
import { IRequest, ILoginRequest } from "../../interfaces/request";
import SessionController from '../../session/session-controller';

export default class UserController {
  private database: IDatabase;
  private configs: IServerConfigurations;
  private sessionController: SessionController;

  constructor(configs: IServerConfigurations, database: IDatabase) {
    this.database = database;
    this.configs = configs;
    this.sessionController = new SessionController(configs, database);
  }

  private generateToken(user: IUser) {
    const jwtSecret = this.configs.jwtSecret;
    const jwtExpiration = this.configs.jwtExpiration;
    const payload = { id: user._id, scope: user.roles, relatedToId: user.relatedToId, relatedTo: user.relatedTo };

    return Jwt.sign(payload, jwtSecret, { expiresIn: jwtExpiration });
  }

  public async loginUser(request: ILoginRequest, h: Hapi.ResponseToolkit) {
    const { email, password } = request.payload;

    const user = await this.database.userModel.findOne({ email: email, deleted: false });

    if (!user) {
      return Boom.unauthorized('User does not exist.');
    }

    if (!user.validatePassword(password)) {
      return Boom.unauthorized('Password is invalid.');
    }

    if (user.relatedTo) { //user is not and admin
      let accountantId;
      if (user.relatedTo === 'company') {
        const company = await this.database.companyModel.findOne({ _id: user.relatedToId, isActive: true, deleted: false }).lean(true);
        if (!company) {
          return Boom.unauthorized("Your account has been deactivated. Please contact your accountant.");
        }
        accountantId = company.accountantId;
      } else {
        accountantId = user.relatedToId;
      }
      const accountant = await this.database.accountantModel.findOne({ _id: accountantId, isActive: true, deleted: false }).lean(true);
      if (!accountant) {
        return Boom.unauthorized("Your account has been deactivated. Please contact the administrators.");
      }
    }

    const token = this.generateToken(user);
    const decoded = Jwt.verify(token, this.configs.jwtSecret);
    try {
      await this.sessionController.createSession(decoded['id'], decoded['iat'], request.headers['user-agent'] || "");
      return { email, relatedToId: user.relatedToId, relatedTo: user.relatedTo, token };
    } catch (error) {
      return Boom.badImplementation(error);
    }
  }

  public async logoutUser(request: IRequest, h: Hapi.ResponseToolkit) {
    try {
      await this.sessionController.invalidateSession(request.auth.credentials);
      return { token: request.headers.authorization, isValid: false };
    } catch (error) {
      return Boom.badImplementation(error);
    }
  }

  public async createUser(request: IRequest, h: Hapi.ResponseToolkit) {
    try {
      await this.database.userModel.create(request.payload);
      return h.response({ created: true }).code(201);
    } catch (error) {
      return Boom.badImplementation(error);
    }
  }

  public async updateUser(request: IRequest, h: Hapi.ResponseToolkit) {
    const id = request.auth.credentials.id;
    try {
      const user = await this.database.userModel.findOneAndUpdate({ _id: id, deleted: false }, request.payload, { new: true });
      if (user) {
        return h.response(user).code(200);
      } else {
        return Boom.notFound();
      }
    } catch (error) {
      return Boom.badImplementation(error);
    }
  }

  public async changePassword(request: IRequest, h: Hapi.ResponseToolkit) {
    const id = request.auth.credentials.id;
    const user = await this.database.userModel.findById(id);
    if (!user) {
      return Boom.unauthorized('User does not exist.');
    }
    if (!user.validatePassword(request.payload['currentPassword'])) {
      return Boom.unauthorized('Password is invalid.');
    }
    user.password = request.payload['newPassword'];
    user.save();

    return h.response({ message: 'Password changed sucessfully' }).code(200);
  }

  public async updateUserByRelatedToId(relatedToId: string, user: any) {
    const { email, password } = user;
    const oldUser = await this.getUserByRelatedToId(relatedToId);
    oldUser.email = email;
    oldUser.password = password || oldUser.password;

    return await oldUser.save();
  }

  public async getUserByRelatedToId(relatedToId: string) {
    const user = await this.database.userModel.findOne({ relatedToId });
    if (!user) {
      throw new Error("User does not exist");
    }
    return user;
  }

  public async infoUser(request: IRequest, h: Hapi.ResponseToolkit) {
    const id = request.auth.credentials.id;
    return await this.database.userModel.findById(id);
  }
}