require('dotenv').config();
const axios = require('axios').default
const Discord = require('discord.js');
const client = new Discord.Client();
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

client.on('message', msg => {
	if (msg.content === 'ping') {
		console.log(msg);
		msg.reply(quiz[0].question);
	}
});

client.login(process.env.token);
