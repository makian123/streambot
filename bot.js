const Discord = require("discord.js");
const client = new Discord.Client({
	intents: ["GUILDS", "GUILD_MESSAGES"]
});
const fs = require("fs");
let jsdom = require("jsdom");
const $ = require("jquery")(new jsdom.JSDOM().window);;
const request = require("request");

let prefix = ".!";
let notificationChannel = "0";
let cooldown = 60; //In secs

class Server{
	constructor(serverID, notificationID, roleID){
		this.id = serverID;
		this.notificationID = notificationID;
		this.channelLinks = new Array();
		this.roleID = roleID;
	}
}
class Servers{
	constructor(){
		this.srvs = new Array();
	}
}

class apiResponse{
	constructor(){
		this.data = new Array();
	}
}

let AccessToken = '';

const GetToken = (callback) => {
	const options = {
		url: 'https://id.twitch.tv/oauth2/token',
		json: true,
		body: {
			client_id: process.env.twitchClientID,
			client_secret: process.env.twitchClientSecret,
			grant_type: 'client_credentials'
		}
	};

	request.post(options, (err, res, body) => {
		if(err){
			return "Error obtaining the token";
		}
		callback(res);
	});
};

function isCommand(msg){
	for(let i = 0; i < prefix.length; ++i){
		if(prefix[i] != msg[i]) return false;
  	}
  	return true;
}

client.on("messageCreate", message => {
	if(isCommand(message.content)){
		const params = message.content.split(" ");
		let servers = new Servers();
		servers = JSON.parse(fs.readFileSync("streamers.json"));
		
		if(params[0] == prefix + "ping"){
			message.channel.send("pong");
		}
		else if(params[0] == prefix + "twitchAdd"){
			if(params[1] == null){
				message.channel.send("The syntax is " + prefix + "twitchAdd `channelName`");
				return;
			}
			
			const channelLink = params[1];

			for(let i = 0; i < servers.srvs.length; ++i){
				if(servers.srvs[i].id != message.channel.guild.id) continue;
				if(!(message.member.roles.cache.some(role => role == servers.srvs[i].roleID)) || !(message.member.permissions.has(Discord.Permissions.FLAGS.ADMINISTRATOR))){
					message.channel.send("Insufficient permissions");
					return;
				}
				
				if(servers.srvs[i].channelLinks.indexOf(channelLink) != -1){
					message.channel.send("Streamer already exists.");
					return;
				}
				servers.srvs[i].channelLinks.push(channelLink);
				fs.writeFileSync("streamers.json", JSON.stringify(servers));
				message.channel.send("Successfully added `" + channelLink + "` to the streaming list");
				return;
			}
			let server = new Server(message.channel.guild.id, notificationChannel);
			server.channelLinks.push(channelLink);
			servers.srvs.push(server);
			
			fs.writeFileSync("streamers.json", JSON.stringify(servers));
	    }
		else if(params[0] == prefix + "setChannel"){
			if(!(message.member.permissions.has(Discord.Permissions.FLAGS.ADMINISTRATOR))){
				message.channel.send("You dont have sufficient permissions");
				return;
			}
			
			if(params[1] == ""){
				message.channel.send("You didn't specify the channel.");
				return;
			}
			let channelToFind = params[1];
			if(channelToFind.startsWith("<#") && channelToFind.endsWith(">")){
				channelToFind = channelToFind.slice(2, -1);
			}
			else{
				message.channel.send("Invalid channel selected.");
			}
			
			const guild = client.guilds.resolve(message.channel.guild.id);
			const channels = guild.channels.cache.map(channel => channel.id);
			const channelIDs = [...channels.values()];
			for(let i = 0; i < channelIDs.length; ++i){
				let channel = client.channels.cache.find(channel => channel.id == channelIDs[i]);
				if(channelToFind == channel.id){
					for(let j = 0; j < servers.srvs.length; ++j){
						if(servers.srvs[j].id == message.channel.guild.id){
							if(servers.srvs[j].notificationID == channel.id){
								message.channel.send('Notification channel is already set to <#' + channel.id + '>');
							}
							else{
								servers.srvs[j].notificationID = channel.id;
								message.channel.send("Notification channel successfully set to <#" + channelToFind + '>');
							}
							fs.writeFileSync("streamers.json", JSON.stringify(servers));
						}
					}
					break;
				}
			}
		}
		else if(params[0] == prefix + "streamers"){
			for(let i = 0; i < servers.srvs.length; ++i){
				let outputMessage = "Current streamers in this servers are: \n`";
				if(servers.srvs[i].id == message.channel.guild.id){
					for(let j = 0; j < servers.srvs[i].channelLinks.length; ++j){
						outputMessage += servers.srvs[i].channelLinks[j] + '\n';
					}
					message.channel.send(outputMessage + '`');
					break;
				}
			}
		}
		else if(params[0] == prefix + "twitchRemove"){
			if(!(message.member.permissions.has(Discord.Permissions.FLAGS.ADMINISTRATOR))){
				message.channel.send("You dont have sufficient permissions");
				return;
			}
			
			if(params[1] == null){
				message.chanel.send("The syntax is " + prefix + "twitchRemove `channelName`");
				return;
			}
			
			const channelLink = params[1];

			for(let i = 0; i < servers.srvs.length; ++i){
				if(servers.srvs[i].id != message.channel.guild.id) continue;
				for(let j = 0; j < servers.srvs[i].channelLinks.length; ++j){
					if(servers.srvs[i].channelLinks[j] == channelLink){
						servers.srvs[i].channelLinks.splice(j, 1);
						fs.writeFileSync("streamers.json", JSON.stringify(servers));
						message.channel.send("Successfully removed `" + channelLink + "` from the streaming list");
						return;
					}
				}
			}
			message.channel.send("Streamer not found.");
			return;
		}
		else if(params[0] == prefix + "setRole"){
			if(!(message.member.permissions.has(Discord.Permissions.FLAGS.ADMINISTRATOR))){
				message.channel.send("You dont have sufficient permissions");
				return;
			}
			if(params[1] == ""){
				message.channel.send("Invalid role specified");
				return;
			}
			let roleToFind = params[1];
			if(roleToFind.startsWith("<@&") && roleToFind.endsWith(">")){
				roleToFind = roleToFind.slice(3, -1);
			}
			else{
				message.channel.send("Invalid role specified");
			}

			for(let i = 0; i < servers.srvs.length; ++i){
				if(servers.srvs[i].id != message.channel.guild.id) continue;
				if(servers.srvs[i].roleID == roleToFind){
					message.channel.send("Streamer role already set to <@&" + roleToFind + ">");
					return;
				}
				servers.srvs[i].roleID = roleToFind;
				message.channel.send("Role successfully set to: <@&" + roleToFind + ">");
				fs.writeFileSync("streamers.json", JSON.stringify(servers));
			}
		}
	}
});

function SetToken(res){
	AccessToken = res.body.access_token;
}

function RevokeToken(){
	let url = "https://id.twitch.tv/oauth2/revoke?client_id=" + process.env.twitchClientID + "&token=" + AccessToken;
	request.post(url, (err, res, body) => {
		if(err){
			return "Error revoking the token";
		}
		else{
			AccessToken = '';
		}
	});
}

function CheckLiveUsers(userList){
	if(AccessToken == "") return;
	
	let url = 'https://api.twitch.tv/helix/streams?user_login='
	let array = new Array();
	array = userList.split(",");
	url += array[0] + (array.length > 1 ? "&user_login=" : "");
	array.shift();
	array = array.join('&user_login=');
	if(array.length > 0) url += array;
	let channelsLive = "";
	let apiResp = new apiResponse();

	request.get({
		url: url,
		headers: {
			'client-id': process.env.twitchClientID,
			'authorization': 'Bearer ' + AccessToken
		}
	}, (err, res, body) => {
		if(err){
			RevokeToken();
			console.log("Error during twitch request");
			return apiResp;
		}
		else{
			apiResp = JSON.parse(res.body);
			let servers = new Servers();
			servers = JSON.parse(fs.readFileSync("streamers.json"));
			for(let serverIndex = 0; serverIndex < servers.srvs.length; ++serverIndex){
				let server = servers.srvs[serverIndex];
				let guild = client.guilds.cache.get(server.id);
				if(guild == null){
					console.log("Invalid guild");
					break;
				}
				
				for(let channelIndex = 0; channelIndex < server.channelLinks.length; ++channelIndex){
					let streamer = server.channelLinks[channelIndex];
					for(let i = 0; i < apiResp.data.length; ++i){
						if(apiResp.data[i].user_login != streamer){
							continue;
						}
		
						let channel = guild.channels.cache.get(server.notificationID);
						let sendOn = true;
						if(channel == null){
							continue;
						}
						
						let fetching = channel.messages.fetch({limit: 100}).then(messages => {
							messages.forEach(message => {
								message.embeds.forEach(embed => {
									if(embed.footer == null){
										
									}
									else if(Date.parse(embed.footer.text) == Date.parse(apiResp.data[i].started_at)){
										sendOn = false;
									}
									else{
										console.log(Date.parse(embed.footer.text) + " not matching " + Date.parse(apiResp.data[i].started_at));
									}
								});
							});
							
						});
						
						apiResp.data[i].thumbnail_url = apiResp.data[i].thumbnail_url.replace("{width}", "854");
						apiResp.data[i].thumbnail_url = apiResp.data[i].thumbnail_url.replace("{height}", "480");
						const msgEmbed = new Discord.MessageEmbed().setColor('#769ad5')
						.setTitle(streamer + " is livestreaming " + apiResp.data[i].game_name)
						.setURL('https://www.twitch.tv/' + streamer)
						.setDescription(apiResp.data[i].title)
						.setImage(apiResp.data[i].thumbnail_url)
						.setFooter({
							text: apiResp.data[i].started_at
						})
						.setTimestamp(new Date());
						
						fetching.then(() => {
							if(!sendOn) return;
	
							channel.send({embeds: [msgEmbed]});
						});
						
					}
				}
			}
		}
	});

	RevokeToken();
}

function checkChannels(){
	if(AccessToken == "") GetToken(SetToken);
	let servers = new Servers();
	servers = JSON.parse(fs.readFileSync("streamers.json"));
	let channels = "";

	//Adds the channels to the big array
	for(let serverIndex = 0; serverIndex < servers.srvs.length; ++serverIndex){
		let server = servers.srvs[serverIndex];
		for(let channelIndex = 0; channelIndex < server.channelLinks.length; ++channelIndex){
			channels += server.channelLinks[channelIndex];
			if(channelIndex < server.channelLinks.length - 1){
				channels += ',';
			}
		}
	}

	CheckLiveUsers(channels);
	
	setTimeout(checkChannels, cooldown * 1000);
}

client.on("ready", () => {
	console.log("Ready");
	checkChannels();
});
	
client.login(process.env['token']);