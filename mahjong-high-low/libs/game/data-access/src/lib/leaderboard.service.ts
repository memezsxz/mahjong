import {inject, Injectable} from "@angular/core";
import {HttpClient} from "@angular/common/http";
import {toSignal} from "@angular/core/rxjs-interop";
import {LeaderboardEntryModel} from "@hbg/shared-models";
import {Observable} from "rxjs";
import {API_URL} from "./tokens";

@Injectable({ providedIn: 'root' })
export class LeaderboardService {
    private readonly http = inject(HttpClient);
    private readonly API_URL = API_URL;

    readonly topScores= toSignal(
        this.http.get<LeaderboardEntryModel[]>(`${this.API_URL}/top_scores`), {initialValue: []}
    )

    saveScore(data: LeaderboardEntryModel) : Observable<LeaderboardEntryModel> {
        return this.http.post<LeaderboardEntryModel>(`${this.API_URL}/top_scores`, data)
    }
}

// TODO: maybe add validation to the username