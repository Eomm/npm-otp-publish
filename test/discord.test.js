'use strict'

const tape = require('tape')
const test = require('tape-promise').default(tape)
const fastify = require('fastify')
const fastifyWebSocket = require('fastify-websocket')
const { DiscordNotifier } = require('../lib/notifiers/discord')

const nock = require('nock')

const mockLogger = {
  info: () => {},
  error: () => {},
  debug: () => {},
  warning: () => {},
  fatal: () => {}
}

test('getTitle', async t => {
  const config = {
    version: {
      name: '0.1.2'
    }
  }
  const notifier = new DiscordNotifier(config, mockLogger)
  t.equal(notifier.getTitle(), 'Release v0.1.2 waiting for OTP to publish to npm')
  t.end()
})

test('getBody with version only', async t => {
  const config = {
    version: {
      name: '0.1.2'
    },
    githubIssue: {}
  }
  const notifier = new DiscordNotifier(config, mockLogger)
  t.equal(notifier.getBody('ngrok://foo'), `Please provide an OTP ngrok://foo to continue the release for 
npm-otp-publish v0.1.2`)
  t.end()
})

test('getBody with version and version url', async t => {
  const config = {
    version: {
      name: '0.1.2',
      url: 'github.com'
    },
    githubIssue: {}
  }
  const notifier = new DiscordNotifier(config, mockLogger)
  t.equal(notifier.getBody('ngrok://foo'), `Please provide an OTP ngrok://foo to continue the release for 
npm-otp-publish v0.1.2`)
  t.end()
})

test('getBody with everything', async t => {
  const config = {
    version: {
      name: '0.1.2',
      url: 'github.com'
    },
    githubIssue: {
      actor: 'me'
    }
  }
  const notifier = new DiscordNotifier(config, mockLogger)
  t.equal(notifier.getBody('ngrok://foo'), `Please provide an OTP ngrok://foo to continue the release for 
npm-otp-publish v0.1.2 **Requested by**: @me`)
  t.end()
})

test('getAssignees is always empty', async t => {
  const config = {
    githubIssue: {
      releaseTeam: 'team'
    }
  }
  const notifier = new DiscordNotifier(config, mockLogger)
  t.deepEqual(notifier.getAssignees(), [])
  t.end()
})

test('should create and close issue', async t => {
  const repo = 'xyz'
  const owner = 'acme'

  const { reply: messages } = require('./discord-websocket-messages.json')
  const getNextWssReply = () => JSON.stringify(messages.shift())

  const wss = fastify()
  wss.register(fastifyWebSocket, {
    handle (conn) {
      conn.write(getNextWssReply()) // send hello
      conn.write(getNextWssReply()) // send server status

      conn.socket.on('message', (message) => {
        conn.write(getNextWssReply())
      })
    }
  })
  await wss.listen(3000)

  const scope = nock('https://discord.com/api ')
    .get('/v7/gateway/bot')
    .reply(200, {
      url: 'ws://127.0.0.1:3000/',
      shards: 9,
      session_start_limit: {
        total: 1000,
        remaining: 999,
        reset_after: 14400000,
        max_concurrency: 1
      }
    })
    .post('/v7/channels/12345/messages')
    .reply(201, {})

  const config = {
    repo: {
      owner,
      repo
    },
    githubIssue: { actor: 'me' },
    version: { name: '0.1.2' },
    discord: {
      token: 'authToken123',
      channelId: '12345'
    }
  }
  const notifier = new DiscordNotifier(config, mockLogger)
  await notifier.notify('http://ngrokUrl')
  await notifier.end()
  await wss.close()
  scope.done()
  t.ok(true)
  t.end()
})
