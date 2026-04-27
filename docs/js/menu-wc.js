'use strict';

customElements.define('compodoc-menu', class extends HTMLElement {
    constructor() {
        super();
        this.isNormalMode = this.getAttribute('mode') === 'normal';
    }

    connectedCallback() {
        this.render(this.isNormalMode);
    }

    render(isNormalMode) {
        let tp = lithtml.html(`
        <nav>
            <ul class="list">
                <li class="title">
                    <a href="index.html" data-type="index-link">temp-angular documentation</a>
                </li>

                <li class="divider"></li>
                ${ isNormalMode ? `<div id="book-search-input" role="search"><input type="text" placeholder="Type to search"></div>` : '' }
                <li class="chapter">
                    <a data-type="chapter-link" href="index.html"><span class="icon ion-ios-home"></span>Getting started</a>
                    <ul class="links">
                                <li class="link">
                                    <a href="overview.html" data-type="chapter-link">
                                        <span class="icon ion-ios-keypad"></span>Overview
                                    </a>
                                </li>

                            <li class="link">
                                <a href="index.html" data-type="chapter-link">
                                    <span class="icon ion-ios-paper"></span>
                                        README
                                </a>
                            </li>
                                <li class="link">
                                    <a href="dependencies.html" data-type="chapter-link">
                                        <span class="icon ion-ios-list"></span>Dependencies
                                    </a>
                                </li>
                                <li class="link">
                                    <a href="properties.html" data-type="chapter-link">
                                        <span class="icon ion-ios-apps"></span>Properties
                                    </a>
                                </li>

                    </ul>
                </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#components-links"' :
                            'data-bs-target="#xs-components-links"' }>
                            <span class="icon ion-md-cog"></span>
                            <span>Components</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? 'id="components-links"' : 'id="xs-components-links"' }>
                            <li class="link">
                                <a href="components/App.html" data-type="entity-link" >App</a>
                            </li>
                            <li class="link">
                                <a href="components/BetControls.html" data-type="entity-link" >BetControls</a>
                            </li>
                            <li class="link">
                                <a href="components/DeckCounter.html" data-type="entity-link" >DeckCounter</a>
                            </li>
                            <li class="link">
                                <a href="components/GamePage.html" data-type="entity-link" >GamePage</a>
                            </li>
                            <li class="link">
                                <a href="components/Hand.html" data-type="entity-link" >Hand</a>
                            </li>
                            <li class="link">
                                <a href="components/HandHistory.html" data-type="entity-link" >HandHistory</a>
                            </li>
                            <li class="link">
                                <a href="components/LandingPage.html" data-type="entity-link" >LandingPage</a>
                            </li>
                            <li class="link">
                                <a href="components/ScoreDisplay.html" data-type="entity-link" >ScoreDisplay</a>
                            </li>
                            <li class="link">
                                <a href="components/SettingsPanel.html" data-type="entity-link" >SettingsPanel</a>
                            </li>
                            <li class="link">
                                <a href="components/Tile.html" data-type="entity-link" >Tile</a>
                            </li>
                        </ul>
                    </li>
                        <li class="chapter">
                            <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#injectables-links"' :
                                'data-bs-target="#xs-injectables-links"' }>
                                <span class="icon ion-md-arrow-round-down"></span>
                                <span>Injectables</span>
                                <span class="icon ion-ios-arrow-down"></span>
                            </div>
                            <ul class="links collapse " ${ isNormalMode ? 'id="injectables-links"' : 'id="xs-injectables-links"' }>
                                <li class="link">
                                    <a href="injectables/GameAudioManager.html" data-type="entity-link" >GameAudioManager</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/GamePageAudioStateService.html" data-type="entity-link" >GamePageAudioStateService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/GamePageReshuffleSequenceService.html" data-type="entity-link" >GamePageReshuffleSequenceService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/GamePageRevealSequenceService.html" data-type="entity-link" >GamePageRevealSequenceService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/GamePageRoundTransitionService.html" data-type="entity-link" >GamePageRoundTransitionService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/GamePageScoreAnimationService.html" data-type="entity-link" >GamePageScoreAnimationService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/GamePageUiShellService.html" data-type="entity-link" >GamePageUiShellService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/GamePageViewStateService.html" data-type="entity-link" >GamePageViewStateService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/ScoresService.html" data-type="entity-link" >ScoresService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/SettingsService.html" data-type="entity-link" >SettingsService</a>
                                </li>
                            </ul>
                        </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#interfaces-links"' :
                            'data-bs-target="#xs-interfaces-links"' }>
                            <span class="icon ion-md-information-circle-outline"></span>
                            <span>Interfaces</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? ' id="interfaces-links"' : 'id="xs-interfaces-links"' }>
                            <li class="link">
                                <a href="interfaces/DragonTile.html" data-type="entity-link" >DragonTile</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/GameStateModel.html" data-type="entity-link" >GameStateModel</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/HandHistoryItem.html" data-type="entity-link" >HandHistoryItem</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/HandModel.html" data-type="entity-link" >HandModel</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/LeaderboardEntryModel.html" data-type="entity-link" >LeaderboardEntryModel</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/NumberTile.html" data-type="entity-link" >NumberTile</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/PlayerSettingsModel.html" data-type="entity-link" >PlayerSettingsModel</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/StartHiddenHandRevealSequenceOptions.html" data-type="entity-link" >StartHiddenHandRevealSequenceOptions</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/WindTile.html" data-type="entity-link" >WindTile</a>
                            </li>
                        </ul>
                    </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#miscellaneous-links"'
                            : 'data-bs-target="#xs-miscellaneous-links"' }>
                            <span class="icon ion-ios-cube"></span>
                            <span>Miscellaneous</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? 'id="miscellaneous-links"' : 'id="xs-miscellaneous-links"' }>
                            <li class="link">
                                <a href="miscellaneous/enumerations.html" data-type="entity-link">Enums</a>
                            </li>
                            <li class="link">
                                <a href="miscellaneous/functions.html" data-type="entity-link">Functions</a>
                            </li>
                            <li class="link">
                                <a href="miscellaneous/typealiases.html" data-type="entity-link">Type aliases</a>
                            </li>
                            <li class="link">
                                <a href="miscellaneous/variables.html" data-type="entity-link">Variables</a>
                            </li>
                        </ul>
                    </li>
                        <li class="chapter">
                            <a data-type="chapter-link" href="routes.html"><span class="icon ion-ios-git-branch"></span>Routes</a>
                        </li>
                    <li class="chapter">
                        <a data-type="chapter-link" href="coverage.html"><span class="icon ion-ios-stats"></span>Documentation coverage</a>
                    </li>
                    <li class="divider"></li>
                    <li class="copyright">
                        Documentation generated using <a href="https://compodoc.app/" target="_blank" rel="noopener noreferrer">
                            <img data-src="images/compodoc-vectorise.png" class="img-responsive" data-type="compodoc-logo">
                        </a>
                    </li>
            </ul>
        </nav>
        `);
        this.innerHTML = tp.strings;
    }
});