'use strict'

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
    const { version } = this
    const { actor } = this.githubIssue
    return `Please provide an OTP ${ngrokUrl} to continue the release for 
    ${this.repo.name} v${version.name} ${actor ? `**Requested by**: @${actor}` : ''}`
  }

  async notify (ngrokUrl) {
    this.client = new Discord.Client()

    await once(this.client, 'ready')
    this.log.debug(`Logged in as ${this.client.user.tag}!`)

    const message = this.getBody(ngrokUrl)

    const { channelId } = this.discord
    const channel = this.client.channels.cache.get(channelId)
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
