[x] show the value of the hand on revile
[x] remove the win and lose divs from next to the next hand button
[x] fix the look of the next hand button to look like the other buttons follow the style guide
[x] implement the game history feature and on lose or will add a record there, remember to follow the structure currently implemnted in the libs to where you need to add each part of that feature
[x] number image sometimes have alts like number-green-4 and number-red-2 and the images are not showing 
[x] the pause button should become the resume button once the pause screen is there and the icno should animate to the new resume icon and vise versa, and remove the resume button from the pause panel
[x] the user should not be able to edit the number of tiles while in a game
[ ] if the user does not have a username after the game ends ask them to input one and save it so we can save the data to the db

### Animations
- [x] i want the tiles to animate in from the top, first tiles given to the user to come from the top too followeed by the first hand, but on subseqwent plays hidden hand -now shown- will animate to the player's visiable hand place as the cards there animate out of the screen to the bottom
- [x] before it moves its value has to animate to the score, if there is a strick then do the multiplication make it pink then add it to the score and make the score pink for a while before puting it back to black, same for the lose but with the green color and obviosly without the strick, on the loose subtract from the score with the animation and all, then animate the strick out of the screen
- [x] i want some kind of animation and wait for reshuffle but i dont have an idea 
- [ ] game over should not be a panel, similer to win it shoud show a big word of "Game Over" then all the tiles would move out of the screen and it would stay there, all the game over panel suff should then show there under it for the user to choose a next action, the sidebar would animate the score, draw and discard number into the center panel to take thier places as stats, then the sidebar would animate out to the right
- [x] the revile of the cards should be one by one and should look like it is turning, not sure how

### Final touches
[x] the lose or win should not go into history before the revile animation is done, aka: when the lose or win words show 
[x] need to add sound to the game, the tiles geting in and out, the score increasing or decreasing, win and lose sounds, idle music for when playing, sound when clicking on a button, music when in pause, whither they play or not needs to come from the settings for the music or sound
[x] when going back to the landing page the buttons and the top score message/table do not show, and there is nothing stoping the user from using the browser back button to leave the page or the x button, guerd agenst those too and tell them that they will lose progress
[x] add a setting to enable or disable animations, when disabled the revealing cards will hapen at ones and the total value will not animate, the animation of the total going to the core should be removed, other animations stay the same 
[x] from my ide i get import errors because of (HTMLElement, setTimeout, requestAnimationFrame)
[x] split the game page ts to multiple files that can be easily managed
[x] add testing and documentation & fallout the md file for each project in the project 
[x] indicate lose and win in a different way in history cuz the images need to be a bitbigger
[ ] record a video of the app and add instructions on how to run it, mention animations, mention leaderboard is local with justification
[ ] first hands need to have a slide sound
[x] check that the reshuffle number changing is handled in the ui
[ ] make sure to mention what was handwritten and what was ai, the logic and pages was me, the ui looks and animations was ai
[ ] build the app
[ ] add testing to win and lose cases in the ui 