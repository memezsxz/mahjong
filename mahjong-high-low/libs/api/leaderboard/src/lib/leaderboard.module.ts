import {Module} from '@nestjs/common';
import {MongooseModule} from "@nestjs/mongoose";
import {LeaderboardEntryDocument, LeaderboardEntrySchema} from "./leaderboard.schema";
import {LeaderboardController} from "./leaderboard.controller";
import {LeaderboardService} from "./leaderboard.service";
import {LeaderboardRepository} from "./leaderboard.repository";

@Module({
    imports: [
        MongooseModule.forFeature([
            {name: LeaderboardEntryDocument.name, schema: LeaderboardEntrySchema}
        ])
    ],
    controllers: [
        LeaderboardController,
    ],
    providers: [
        LeaderboardService, LeaderboardRepository
    ],
    exports: [
        LeaderboardService
    ],
})
export class LeaderboardModule {}
