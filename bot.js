"use strict"

require('dotenv').config();
const axios = require('axios').default
const Discord = require('discord.js');
const client = new Discord.Client();

const ReplitDB = require("@replit/database");
const clientDB = new ReplitDB();
const clamp = (num, min, max) => Math.min(Math.max(num, min), max);

const quiz = [];
function get_question(arr, next, len) {
	let i = next;
	let question = [];

	while (i < len && !/^#{4} /.test(arr[i])) {
		if (!arr[i].includes("<details>") && !arr[i].includes("<p>")) {
			question.push(arr[i])
		}
		i++;
	}

	return ([question, i]);
}

async function get_quiz() {
	try {
		const response = await axios.get(process.env.quiz_url);
		const arr = response.data.split('\n');
		let i = -1;

		while (++i < arr.length) {
			let answer, question, q;

			[, q] = arr[i].split(/^###### /);
			if (q) {
				[question, i = i] = get_question(arr, i + 1, arr.length);
				answer = arr[i].split(/#### Answer: (.)/)[1];
				question.unshift(q);

				quiz.push({question: question.join("\n"), answer});
			}
		}
		console.log("successfully got the quiz !");

	} catch(err) {
		console.log(err);
	}
};

client.on('ready', async () => {
	await get_quiz();
	console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', async msg => {
  let user, reply, ans, q, tmp;

  try {
    user = JSON.parse(await clientDB.get(msg.author.id));
  } catch(err) {};

	if (msg.content === '!ping') {
    if (user) {
      reply = user.next_q ? quiz[user.next_q].question : "No more question !";
    } else {
      user = {
        id: msg.author.id,
        next_q: 0,
        last_q: 0,
        score: 0,
        q_ok: []
      };
      clientDB.set(user.id, JSON.stringify(user))
    }
    reply = quiz[user.next_q].question;
	} else if (/^!ans/.test(msg.content)) {
    [, q, ans] = msg.content.split(/!ans (\d+) (.)/);
    q = +q - 1;
    tmp = quiz[q];

    reply = (tmp && (tmp.answer === ans)) ? "OK" : "KO";
    // void (tmp && console.log(tmp.question, tmp.answer, ans))
    if (user && reply === "OK") {
      if (!user.q_ok.includes(q)) {
        user.score += 1;
        user.q_ok.push(q);
      }
      reply = `result: ${reply}, score : ${user ? user.score : 0}`;
      user.last_q = q;
    }
  } else if (/^!next/.test(msg.content) && user) {
    user.next_q = clamp(user.last_q + 1, 0, quiz.length);
    user.last_q = user.last_q;
    reply = quiz[user.next_q].question;
  } else if (/^!prev/.test(msg.content) && user) {
    user.next_q = user.last_q % quiz.length;
    user.last_q = clamp(user.last_q - 1, 0, quiz.length);
    reply = quiz[user.next_q].question;
  }  else if (/^!reset/.test(msg.content) && user) {
    clientDB.delete(user.id);
    user = undefined;
    reply = "done !"
  } else if (/^!stats/.test(msg.content) && user) {
    reply = JSON.stringify(await clientDB.get(user.id));
  }
  if (user) clientDB.set(user.id, JSON.stringify(user));
  if (reply) msg.reply(reply);
});

client.login(process.env.token);
