const CordlrPlugin = require('cordlr-plugin')
const request = require('request') // Simple HTTP Request library

module.exports = class DDG extends CordlrPlugin {
  constructor (bot, config) {
    super(bot, config)

    this.name = 'ddg' // Plugin Name
    this.description = 'DuckDuckGo Search Engien - Instant Answer API' // Plugin Description

    this.commands = {
      'ddg': { // Plugin Command --> !ddg
        'usage': '[<!bang> <search string>] or <search string>',
        'function': 'Duckduckgo', // Plugin Main Function
        'description': 'DuckDuckGo Instant Answer API Search', 
        'permissions': []
      }
    }
  }

  // Plugin Main Function
  Duckduckgo(message, args, flags) {
    // Search string
    const urlQuery = args.join(' ')

    if (!urlQuery) {
      let prefix = this.config.prefix
      let ddgUsage = ` ${prefix}ddg ${this.commands.ddg.usage}`
      let ddgUsageTitle = `${prefix}ddg Usage`
      let ddgUsageEg = `Example: ${prefix}ddg bioshock or ${prefix}ddg !yt shakira`

      return this.sendInfo(message, ddgUsage, ddgUsageTitle, {text: ddgUsageEg}, 'warning')
    }

    // Colors
    const errorColor = this.colorToDecimal('#fc5246')
    const successColor = this.colorToDecimal('#36c17e')

    // Fetch DuckDuckGo Instant Answer API Result
    request(this.getUrl(urlQuery), (error, response, body) => {
      if (error !== null) {
        // If there is an error fetching the result
        this.bot.emit('error', new Error('Cordlr-ddg Request error:' + error))
        return this.sendInfo(message, 'Something is wrong :/', 'Error', {}, 'error')
      }
      
      // If response code is == 200
      if (response.statusCode == 200) {
        const json = JSON.parse(body) // convert body to json
      
        if (urlQuery[0] == '!') { // E.g !g !yt !github !wiki
          // Results with !bang has redirect result
          return this.sendEmbed(message, {
            title: json.Redirect,
            url: json.Redirect,
            description: 'Redirect link',
            color: successColor,
            footer: {
              text: urlQuery
            }
          })
        }

        // Normal DuckDuckGo result
        if (json.Heading) {
          return this.sendEmbed(message, {
            title: json.AbstractSource,
            description: json.AbstractText || 'Could\'t find any description',
            url: json.AbstractURL,
            color: successColor,
            footer: {
              text: json.Heading
            }
          })
        }

        else {
          // Empty result
          return this.sendInfo(message, 'Couldn\'t find any results :(', 'No Result', {}, 'error')
        }
      }
    })
  }

  // Create DuckDuckGo Query URL with Options
  getUrl(urlQuery) {
    const baseUrl = 'https://api.duckduckgo.com/?q=' // DuckDuckGo Query URL
    const urlRedirect = '&no_redirect=1' // 1 = No redirect
    const urlFormat = '&format=json' // json or xml
    const urlPretty = '&pretty=1' // 1 = turn on pretty formating
    const urlHtml = '&no_html=1' // 1 = no HTML
    const urlDisambiguation = '&skip_disambig=1' // 1 = no disambiguation
    const urlUnique = '&t=cordlr-ddg' // Unique identifier

    return (baseUrl + urlQuery + urlFormat + urlPretty + urlRedirect + urlHtml + urlDisambiguation + urlUnique)
  }
}