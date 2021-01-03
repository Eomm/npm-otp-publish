'use strict'

const path = require('path')
const { once } = require('events')
const Discord = require('discord.js')

class DiscordNotifier {
  constructor ({ repo, version, githubIssue, discord }, log) {
    log.info({ repo }, 'creating Discord notifier')
    this.log = log
    this.discord = discord
    this.repo = repo
    this.version = version
    this.githubIssue = githubIssue
  }

  getTitle () {
    const { version } = this
    return `Release v${version.name} waiting for OTP to publish to npm`
  }

  getBody (ngrokUrl) {
    const { version, repo } = this
    const { actor } = this.githubIssue
    const unnamedRepo = path.basename(process.cwd())

    return `Please provide an OTP ${ngrokUrl} to continue the release for 
${repo ? repo.name || repo.repo : unnamedRepo} v${version.name}${actor ? ` **Requested by**: @${actor}` : ''}`
  }

  getAssignees () {
    return []
  }

  async notify (ngrokUrl) {
    const { token, channelId } = this.discord
    const client = new Discord.Client({
      retryLimit: 0,
      ws: { large_threshold: 1 }
    })
    this.client = client

    // client.on('debug', console.log)
    client.login(token)
    await once(client, 'ready')
    this.log.debug(`Logged in as ${client.user.tag}!`)

    const message = this.getBody(ngrokUrl)

    const channel = client.channels.cache.get(channelId)
    if (channel) {
      await channel.send(message)
    } else {
      const errMsg = `Cannot find Channel ${channelId}, Did you add this bot to your server?`
      this.log.error(errMsg)
      throw new Error(errMsg)
    }
  }

  async end () {
    this.client.destroy()
    this.log.debug('Discord client closed')
  }
}

module.exports = { DiscordNotifier }
