import {Injectable} from "@nestjs/common";
import {LeaderboardRepository} from "./leaderboard.repository";
import {LeaderboardEntryModel} from "@hbg/shared-models";
import {LeaderboardEntryDocument} from "./leaderboard.schema";

@Injectable()
export class LeaderboardService {
    constructor(private readonly leaderboardRepository: LeaderboardRepository) {}

    async topFiveScores(): Promise<LeaderboardEntryDocument[]> {
        return this.leaderboardRepository.findTopFive()
    }

    async saveScore(data: LeaderboardEntryModel): Promise<LeaderboardEntryModel> {
        return this.leaderboardRepository.save(data)
    }
}