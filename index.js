const CordlrPlugin = require('cordlr-plugin')
const request = require('request') // Simple HTTP Request library
const urlParse = require('url').parse // Parse URL to get hostname

module.exports = class DDG extends CordlrPlugin {
  constructor (bot, config) {
    super(bot, config)

    this.name = 'ddg' // Plugin Name
    this.description = 'DuckDuckGo Search Engine - Instant Answer API' // Plugin Description

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
    const encodedUrlQuery = encodeURIComponent(urlQuery)

    if (!urlQuery) {
      let prefix = this.config.prefix
      let ddgUsage = ` ${prefix}ddg ${this.commands.ddg.usage}`
      let ddgUsageTitle = `${prefix}ddg Usage`
      let ddgUsageEg = `Example: ${prefix}ddg bioshock or ${prefix}ddg !yt shakira`

      return this.sendInfo(message, ddgUsage, ddgUsageTitle, {text: ddgUsageEg}, 'warning')
    }

    // DuckDuckGo API Query URL with Options
    const url = this.getUrl(encodedUrlQuery)

    // Fetch DuckDuckGo Instant Answer API Result
    request(url, (error, response, body) => {
      if (error !== null) {
        // If there is an error fetching the result
        this.bot.emit('error', new Error('Cordlr-ddg Request error:' + error))
        return this.sendInfo(message, 'Something is wrong :/', 'Error', {}, 'error')
      }
      
      // If response code is == 200
      if (response.statusCode == 200) {
        const json = JSON.parse(body) // convert body to json
        let fields = [] // Empty placeholder
        let redirectName = ''

        if (urlQuery[0] == '!') { // E.g !g !yt !github !wiki
          // Get Search Engine Name (E.g "www.youtube.com", "encrypted.google.com", "github.com")
          redirectName = urlParse(json.Redirect).hostname

          // Results with !bang has redirect result
          fields.push({
            name: redirectName,
            value: json.Redirect,
            inline: true
          })
        }

        // Normal DuckDuckGo result
        else if (json.Heading) {
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
              if (json.RelatedTopics[k-1].FirstURL) {
                fields.push({
                  name: json.RelatedTopics[k-1].Text || urlQuery,
                  value: json.RelatedTopics[k-1].FirstURL,
                  inline: true
                })
              }

              k--
            }
          }

          // Abstract result
          fields.unshift({
            name: json.AbstractSource,
            value: `${json.AbstractText} \n ${json.AbstractURL}`,
            inline: true
          })
        }

        // if search string for example is
        // 10 + 20 then json.Answer would be 30
        if (json.Answer) {
          fields.push({
            name: `Answer for ${urlQuery}`,
            value: json.Answer,
            inline: true
          })
        }

        if (!fields) {
          // Empty result
          return this.sendInfo(message, 'Couldn\'t find any results :(', 'No Result', {}, 'error')
        }

        // Colors
        const errorColor = this.colorToDecimal('#fc5246')
        const successColor = this.colorToDecimal('#36c17e')

        // If there is a redirectName
        // it means thay already use !bang.
        // No need to inform about the !bangs
        let description  = ''
        
        // If No redirectName means they didnt
        // use !bang and therfore we can inform
        // them about the use of !bang.
        if (!redirectName) {
          // Inform about !bangs
          description = 'You can also use !bang\'s such as !g (google) !yt (youtube), etc, \n Read more about it at (https://duckduckgo.com/bang).'
        }

        // Send the results DuckDuckGo could Fetch
        return this.sendEmbed(message, {
          title: `Here are your search results for ${urlQuery} \n`,
          description: description,
          url: '',
          color: successColor,
          fields: fields,
          footer: {
            text: 'Results from DuckDuckGo',
            icon_url: 'https://duckduckgo.com/assets/icons/meta/DDG-icon_256x256.png',
            proxy_icon_url: 'https://duckduckgo.com'
          }
        })
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