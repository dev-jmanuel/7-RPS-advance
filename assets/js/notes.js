// ================================================= //
//  FIREBASE: CONFIG
// ================================================= //

// Initialize Firebase
var config = {
    apiKey: "AIzaSyBP75PtWq94b3UXDdlBSE8gYgE9N0cPr3Q",
    authDomain: "rps-advanced.firebaseapp.com",
    databaseURL: "https://rps-advanced.firebaseio.com",
    projectId: "rps-advanced",
    storageBucket: "rps-advanced.appspot.com",
    messagingSenderId: "234454356374"
};
firebase.initializeApp(config);

// Establish firebase database
var database = firebase.database();

// ================================================= //
// AUTHENTICATION.JS
// ================================================= //

// DOM cache for auth functions
var $logUser = $('#username');
var $btnCreate = $('#create-btn');
var $btnLogout = $('#logout-btn');

// Realtime listener to pull players in game lobby
database.ref("/lobby").on("child_added", function(childSnapshot) {
    console.log('new player: ' + childSnapshot.val().name);

});

// ================================================= //
//  BUTTON EVENT: ADD PLAYER TO LOBBY
// ================================================= //

// Add a create new user event
$btnCreate.click(function(event) {
    event.preventDefault();

    // Get username and new stats
    userName = $logUser.val().trim();

    // Code for handling push
    database.ref("/lobby").push({
        name: userName,
        dateAdded: firebase.database.ServerValue.TIMESTAMP

    }); 
    
    // Bring user to the lobby with logout button
    $('.logout-btn').css('display', 'unset');
    $('.cloak-lobby').css('display', 'unset');
    $('.cloak-log').css('display', 'none');
    
});

// Greet the new player in the chat 
database.ref('/lobby').orderByChild("dateAdded").limitToLast(1).on("child_added", function(snapshot) {
    $chatUi.append("<li class='msg-entry'>" + snapshot.val().name + " has joined! </li>");

});

// Create a Log-out event
$btnLogout.click(function() {

    // Bring user back to the log in page
    $('.cloak-log').css('display', 'unset');
    $('.logout-btn').css('display', 'none');
    $('.cloak-lobby').css('display', 'none');

});

// ================================================= //
//  CHATBOX.JS
// ================================================= //

// Reference chat
var chatRef = database.ref('/chat');

// DOM cache chat
var $chatBtn = $('#send');
var $chatInput = $('#message');
var $chatUi = $('#chat-window').find('ul');

// Create a realtime listener for incoming messages
chatRef.on('child_added', function(childSnapshot) {

    // Add message value into a variable
    var message = childSnapshot.val();
    console.log("msg: " + message);

    // Append the new message to the chat window
    $chatUi.append("<li class='msg-entry'>" + message + "</li>");

});

// Create a submit message event (click and keypress:enter)
function submit() {  

    // Push the current message from the text input onto the database
    chatRef.push($chatInput.val().trim(),
    );

    // Clear text input
    $chatInput.val('');  
}

// Trigger submit function: click & enter
$chatBtn.click(function() {
    submit();
});

$(document).on('keypress',function(event) {
    if(event.which == 13) {
        submit();
    }
});

// ================================================= //
// RPS GAME.JS
// ================================================= //

//  DOM cache for game functions
var $matchBtn = $('#find-match');

// Global variables for game functions
var plOne = null;
var plTwo = null;
var plOneName = "";
var plTwoName = "";
var userName = "";
var plOneChoice = "";
var plTwoChoice = "";
var turn = 1;
var counter = 5;

// Attach a listener to the database /game/ node to listen for any changes
database.ref("/game/").on("value", function(snapshot) {
	// Check for existence of player 1 in the database
	if (snapshot.child("plOne").exists()) {
		console.log("Player 1 exists");

		// Record player one data
		plOne = snapshot.val().plOne;
		plOneName = plOne.name;

	} else {
		console.log("Player 1 does NOT exist");

		plOne = null;
		plOneName = "";

	}

	// Check for existence of player 2 in the database
	if (snapshot.child("plTwo").exists()) {
		console.log("Player 2 exists");

		// Record player two data
		plTwo = snapshot.val().plTwo;
		plTwoName = plTwo.name;

	} else {
		console.log("Player 2 does NOT exist");

		plTwo = null;
		plTwoName = "";

	}

    // If only player one is present
    if (plOne && !plTwo) {
        console.log(plOne.name + " is waiting for an opponent!")

        $chatUi.append("<li class='msg-entry'>" + plOne.name + " is waiting for an opponent!</li>");
    }


	// If both players are now present, it's plOne's turn
	if (plOne && plTwo) {

        // Game match up chat entry
        $chatUi.append("<li class='msg-entry'>" + plOne.name + " and " + plTwo.name +" are in a game!</li>");

        // Add usernames to the player consoles
        $(".player-one").html(plOneName);
        $(".player-two").html(plTwoName);
        
        // Bring users to the game match
        $(".cloak-wait").css("display", "none");
        $(".cloak-lobby").css("display", "none");
        $(".cloak-game").css("display", "unset");

	}

	// If both players leave the game, empty the chat session
	if (!plOne && !plTwo) {
		database.ref("/chat/").remove();
		database.ref("/turn/").remove();
		database.ref("/outcome/").remove();

	}
});

// Button to get into game match 
$matchBtn.click(function() {

    // If there is no existing game, add user into new one as player one
    if ( !(plOne && plTwo) ) {
        if (plOne === null) {
            console.log("Adding Player One");

            // Add player one to the database
            userName = $logUser.val().trim();
            plOne = {
                name: userName,
                win: 0,
                loss: 0,
                tie: 0,
                choice: ""
            };

            database.ref("/game/plOne").set(plOne);

            // Add username into player one console
            $(".user-name").html(userName);

            // Set the turn value to 1 to ensure the plOne always goes first
            database.ref().child("/turn").set(1);

            // Remove user from database upon disconnecting 
            database.ref("/game/plOne").onDisconnect().remove();
        
        // if there is an existing game, add player two into it
        } else if ( (plOne !== null) && (plTwo === null) ) {
            console.log("Adding Player Two");

            // Add player two to the database
            userName = $logUser.val().trim();
            plTwo = {
                name: userName,
                win: 0,
                loss: 0,
                tie: 0,
                choice: ""
            };

            database.ref("/game/plTwo").set(plTwo);

            // Remove user from database upon disconnecting 
            database.ref("/game/plTwo").onDisconnect().remove();
            
        }

    }

}); 

// ================================================= //
//  FIREBASE: PLAYER TURN LISTENER
// ================================================= //
// Attach a listener to the database /turn/ node to listen for any changes
database.ref("/turn/").on("value", function(snapshot) {
	// Check if it's player one's turn
	if (snapshot.val() === 1) {
		console.log("Player one's turn");
		turn = 1;

        // Change display to indicate turn
        $(".gs-entry").html(plOneName + "'s turn");
        $(".pl-one-choices").css("display", "unset");
        $(".pl-two-choices").css("display", "none");

	} else if (snapshot.val() === 2) {
		console.log("Player two's turn");
		turn = 2;

        // Change display to indicate turn
        $(".gs-entry").html(plTwoName + "'s turn");
        $(".pl-one-choices").css("display", "none");
        $(".pl-two-choices").css("display", "unset");

    } else if (snapshot.val() === 3) {
		console.log("Player two's turn");
		turn = 3;

        // Change display to show results
        $(".pl-two-choices").css("display", "none");
        $(".results").css("display", "unset");
        $(".lob-rem").css("display", "unset");
        
    	// Compare the players choices and record the outcome
        endGame();
    }

});

// ================================================= //
//  GAME FUNCTION: P1 CHOICE
// ================================================= //

// Capture player one's rps choice
$(".pl-one-choice").click(function(event) {
	event.preventDefault();

	// Make selections only when both players are exist; check if user is player one; check if turn value is 1
	if (plOne && plTwo && (userName === plOne.name) && (turn === 1) ) {
		// Record player one's choice
		var choice = $(this).text().trim();

		// Record the player choice into the database
		plOneChoice = choice;
		database.ref().child("/game/plOne/choice").set(choice);

		// Set the turn value to 2 to indicate player two's turn
		turn = 2;
		database.ref().child("/turn").set(2);
    }
    
});

// ================================================= //
//  GAME FUNCTION: P2 CHOICE
// ================================================= //

// Monitor player two's selection
$(".pl-two-choice").click(function(event) {
	event.preventDefault();

	// Make selections only when both players are exist; check if user is player two; check if turn value is 2
	if (plOne && plTwo && (userName === plTwo.name) && (turn === 2) ) {
		// Record player two's choice
		var choice = $(this).text().trim();

		// Record the player choice into the database
		plTwoChoice = choice;
		database.ref().child("/game/plTwo/choice").set(choice);

        // Set the turn value to 3 to indicate the results
		turn = 3;
        database.ref().child("/turn").set(3);
        
	}
});

// ================================================= //
//  FIREBASE: WHO WON THE GAME LISTENER 
// ================================================= //
// Attach a listener to the database /outcome/ node to be notified of the game outcome
database.ref("/outcome/").on("value", function(snapshot) {
	$('final').html(snapshot.val()); //ERRORERRORERRORERROR
});

// Endgame function
function endGame() {

    // RPS game rules
    if ((plOne.choice === "Rock!" && plTwo.choice === "Scissors!") ||
        (plOne.choice === "Scissors!" && plTwo.choice === "Paper!") || 
        (plOne.choice === "Paper!" && plTwo.choice === "Rock!")) {
        console.log(plOneName + " wins");

        // Add results to player stats
        database.ref().child("/game/plOne/win").set(plOne.win + 1);
        database.ref().child("/game/plTwo/loss").set(plTwo.loss + 1);

        // Display results
        $(".pl-one-wins").html("Wins: " + plOne.win);
        $(".pl-two-wins").html("Wins: " + plTwo.win);
        $(".pl-one-losses").html("Losses: " + plOne.loss);
        $(".pl-two-losses").html("Losses: " + plTwo.loss);
        $(".pl-one-ties").html("Ties: " + plOne.tie);
        $(".pl-two-ties").html("Ties: " + plTwo.tie);
        $(".gs-entry").html(plOneName + " wins");

    } else if (plOne.choice === plTwo.choice) {
        console.log("It's a tie");

        // Add results to player stats and display
        database.ref().child("/game/plOne/tie").set(plOne.tie + 1);
        database.ref().child("/game/plTwo/tie").set(plTwo.tie + 1);
        $(".pl-one-ties").html("T: " + plOne.tie);
        $(".pl-two-ties").html("T: " + plTwo.tie);

        // Display results
        $(".pl-one-wins").html("Wins: " + plOne.win);
        $(".pl-two-wins").html("Wins: " + plTwo.win);
        $(".pl-one-losses").html("Losses: " + plOne.loss);
        $(".pl-two-losses").html("Losses: " + plTwo.loss);
        $(".pl-one-ties").html("Ties: " + plOne.tie);
        $(".pl-two-ties").html("Ties: " + plTwo.tie);
        $(".gs-entry").html("It's a tie");

    } else {
        console.log(plTwoName + " wins");

        // Add results to player stats and display
        database.ref().child("/game/plTwo/win").set(plTwo.win + 1);
        $(".pl-two-wins").html("W: " + plTwo.win);
        database.ref().child("/game/plOne/loss").set(plOne.loss + 1);
        $(".pl-one-losses").html("L: " + plOne.loss);

        // Display results
        $(".pl-one-wins").html("Wins: " + plOne.win);
        $(".pl-two-wins").html("Wins: " + plTwo.win);
        $(".pl-one-losses").html("Losses: " + plOne.loss);
        $(".pl-two-losses").html("Losses: " + plTwo.loss);
        $(".pl-one-ties").html("Ties: " + plOne.tie);
        $(".pl-two-ties").html("Ties: " + plTwo.tie);
        $(".gs-entry").html(plOneName + " wins");

    }
    

    // Reset game turn
	// turn = 1;
	// database.ref().child("/turn").set(1);

}


