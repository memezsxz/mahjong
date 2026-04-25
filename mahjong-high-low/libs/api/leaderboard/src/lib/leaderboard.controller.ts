import {Body, Controller, Get, Post} from "@nestjs/common";
import {LeaderboardEntryDocument} from "./leaderboard.schema";
import type {LeaderboardEntryModel} from "@hbg/shared-models";
import {LeaderboardService} from "./leaderboard.service";

@Controller('leaderboard')
export class LeaderboardController {
    constructor(private readonly leaderboardService: LeaderboardService) {
    }

    @Get()
    async getTopFive(): Promise<LeaderboardEntryDocument[]> {
        return this.leaderboardService.topFiveScores();
    }

    @Post()
    async saveGame(@Body() data: LeaderboardEntryModel): Promise<LeaderboardEntryModel> {
        return this.leaderboardService.saveScore(data)
    }
}