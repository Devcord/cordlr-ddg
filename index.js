const CordlrPlugin = require('cordlr-plugin')
const request = require('request') // Simple HTTP Request library
const urlParse = require('url').parse // Parse URL to get hostname

module.exports = class DDG extends CordlrPlugin {
  constructor (bot, config) {
    super(bot, config)

    this.name = 'ddg'
    this.description = 'DuckDuckGo Search Engine - Instant Answer API'

    this.commands = {
      'ddg': {
        'usage': '[<!bang> <search string>] or <search string>',
        'function': 'Duckduckgo',
        'description': 'DuckDuckGo Instant Answer API Search',
        'permissions': []
      }
    }
  }

  Duckduckgo (message, args, flags) {
    // Search string
    const urlQuery = args.join(' ') // The actual search Query
    const encodedUrlQuery = encodeURIComponent(urlQuery) // URI encoded search Query

    // If no search string
    // Then show how to use the plugin
    if (!urlQuery) {
      this.usage(message)
    } else {
      // DuckDuckGo API Query URL with Options
      const url = this.getUrl(encodedUrlQuery)

      // Fetch DuckDuckGo Instant Answer API Result
      request(url, (error, response, body) => {
        // Check if any Error
        const err = this.handleError(message, error)

        // If response code is == 200 and no error
        if (!err && response.statusCode === 200) {
          // Parse the data and return Results
          const data = this.parseData(body, urlQuery)

          // Send to discord chat
          this.send(message, data)
        }
      })
    }
  }

  // Will print how to use this plugin
  usage (message) {
    const prefix = this.config.prefix
    const ddgUsage = ` ${prefix}ddg ${this.commands.ddg.usage}`
    const ddgUsageTitle = `${prefix}ddg Usage`
    const ddgUsageEg = `Example: ${prefix}ddg bioshock | ${prefix}ddg !yt shakira`

    return this.sendInfo(message, ddgUsage, ddgUsageTitle, {text: ddgUsageEg}, 'warning')
  }

  // Create DuckDuckGo Query URL with Options
  getUrl (urlQuery) {
    const baseUrl = 'https://api.duckduckgo.com/?q=' // DuckDuckGo Query URL
    const urlRedirect = '&no_redirect=1' // 1 = No redirect
    const urlFormat = '&format=json' // json or xml
    const urlPretty = '&pretty=1' // 1 = turn on pretty formating
    const urlHtml = '&no_html=1' // 1 = no HTML
    const urlDisambiguation = '&skip_disambig=1' // 1 = no disambiguation
    const urlUnique = '&t=cordlr-ddg' // Unique identifier

    return (baseUrl + urlQuery + urlFormat + urlPretty + urlRedirect + urlHtml + urlDisambiguation + urlUnique)
  }

  // Will check for error
  handleError (message, error) {
    if (error !== null) {
      // Print an error to console
      this.bot.emit('error', new Error('Cordlr-ddg Request error:' + error))
      // Show an error in Discord
      this.sendInfo(message, 'Something is wrong :/', 'Error', {}, 'error')

      return true
    }
    return false
  }

  // Will parse data and get all results
  parseData (body, urlQuery) {
    const json = JSON.parse(body) // convert body to json

    const fields = [] // Empty placeholder
    let redirectName = '' // Empty if no redirect link

    if (urlQuery[0] === '!') { // E.g !g !yt !github !wiki
      // Get Search Engine Name (E.g "www.youtube.com", "encrypted.google.com", "github.com")
      redirectName = urlParse(json.Redirect).hostname

      // Results with !bang has redirect result
      if (json.Redirect) { // Must be a valid !bang search
        fields.push({
          name: redirectName,
          value: json.Redirect,
          inline: false
        })
      }
    } else if (json.Heading) { // Normal DuckDuckGo result
      // If there are Related Topics
      if (json.RelatedTopics) {
        let k = 3 // Loop 3 times

        // If there is less than 3 related topics
        if (json.RelatedTopics.length < 3) {
          k = json.RelatedTopics.length
        }

        // Only fetch top 3 results, or less
        while (k > 0) {
          // No Value is not allowed!
          if (json.RelatedTopics[k - 1].FirstURL) {
            fields.push({
              name: json.RelatedTopics[k - 1].Text || urlQuery,
              value: json.RelatedTopics[k - 1].FirstURL,
              inline: false
            })
          }

          k--
        }
      }

      // Abstract result
      fields.unshift({ // Add to the start of Array
        name: json.AbstractSource,
        value: `${json.AbstractText}\n ${json.AbstractURL}`,
        inline: false
      })
    }

    // if search string is 10 + 20
    // than json.Answer would be 30
    if (json.Answer) {
      fields.push({
        name: `Answer for ${urlQuery}`,
        value: json.Answer,
        inline: false
      })
    }

    return {
      fields: fields,
      redirect: redirectName,
      urlQuery: urlQuery
    }
  }

  send (message, data) {
    if (data.fields.length < 1) { // If no Results found
      return this.sendInfo(message, 'Could not find any results :(', 'No Result', {}, 'error')
    }

    // If redirect, no description is necessary
    let description = ''

    if (!data.redirect) {
      // Inform about !bangs
      description = 'You can also use !bang\'s such as !g (google) !yt (youtube), etc,\n Read more about it at (https://duckduckgo.com/bang).'
    }

    // Green Color
    const successColor = this.colorToDecimal('#36c17e')

    // Send the results DuckDuckGo could Fetch
    return this.sendEmbed(message, {
      title: `Here are your search results for ${data.urlQuery}`,
      description: description,
      url: '', // This will make the title a clickable link (blue)
      color: successColor,
      fields: data.fields,
      footer: {
        text: 'Results from DuckDuckGo',
        icon_url: 'https://duckduckgo.com/assets/icons/meta/DDG-icon_256x256.png',
        proxy_icon_url: 'https://duckduckgo.com'
      }
    })
  }
}
