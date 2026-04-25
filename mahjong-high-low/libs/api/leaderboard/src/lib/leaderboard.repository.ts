import {InjectModel} from "@nestjs/mongoose";
import {LeaderboardEntryModel} from "@hbg/shared-models";
import {Model} from "mongoose";
import {LeaderboardEntryDocument} from "./leaderboard.schema";
import {Injectable} from "@nestjs/common";

@Injectable()
export class LeaderboardRepository {
    constructor( @InjectModel(LeaderboardEntryDocument.name) private readonly model: Model<LeaderboardEntryDocument>) {
    }

    async findTopFive() : Promise<LeaderboardEntryDocument[]> {
        return this.model.find().sort(({totalScore:-1})).limit(5).exec();
    }

    async save(entry: LeaderboardEntryModel) : Promise<LeaderboardEntryDocument> {
        const create = new this.model(entry);
        return await create.save();
    }
}