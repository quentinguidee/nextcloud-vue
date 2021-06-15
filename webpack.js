const webpackConfig = require('@nextcloud/webpack-vue-config')
const webpackRules = require('@nextcloud/webpack-vue-config/rules')

const fs = require('fs')
const gettextParser = require('gettext-parser')
const glob = require('glob')
const md5 = require('md5')
const path = require('path')

const { DefinePlugin } = require('webpack')
const nodeExternals = require('webpack-node-externals')

// scope variable
// fallback for cypress testing
const appVersion = JSON.stringify(process.env.npm_package_version || 'nextcloud-vue')
const versionHash = md5(appVersion).substr(0, 7)
const SCOPE_VERSION = JSON.stringify(versionHash)

console.info('This build version hash is', versionHash, '\n')

// https://github.com/alexanderwallin/node-gettext#usage
// https://github.com/alexanderwallin/node-gettext#load-and-add-translations-from-mo-or-po-files
const translations = fs
	.readdirSync('./l10n')
	.filter(name => name !== 'messages.pot' && name.endsWith('.pot'))
	.map(file => {
		const path = './l10n/' + file
		const locale = file.substr(0, file.length - '.pot'.length)

		const po = fs.readFileSync(path)
		const json = gettextParser.po.parse(po)

		// Compress translations Content
		const translations = {}
		for (const key in json.translations['']) {
			if (key !== '') {
				// Plural
				if ('msgid_plural'in json.translations[''][key]) {
					translations[json.translations[''][key].msgid] = {
						pluralId: json.translations[''][key].msgid_plural,
						msgstr: json.translations[''][key].msgstr,
					}
					continue
				}

				// Singular
				translations[json.translations[''][key].msgid] = json.translations[''][key].msgstr[0]
			}
		}

		return {
			locale,
			translations,
		}
	})

webpackConfig.entry = {
	ncvuecomponents: path.join(__dirname, 'src', 'index.js'),
	...glob.sync('src/components/*/index.js').reduce((acc, item) => {
		const name = item
			.replace('/index.js', '')
			.replace('src/components/', 'Components/')
		acc[name] = path.join(__dirname, item)
		return acc
	}, {}),
	...glob.sync('src/directives/*/index.js').reduce((acc, item) => {
		const name = item
			.replace('/index.js', '')
			.replace('src/directives/', 'Directives/')
		acc[name] = path.join(__dirname, item)
		return acc
	}, {}),
	...glob.sync('src/functions/*/index.js').reduce((acc, item) => {
		const name = item
			.replace('/index.js', '')
			.replace('src/functions/', 'Functions/')
		acc[name] = path.join(__dirname, item)
		return acc
	}, {}),
	...glob.sync('src/mixins/*/index.js').reduce((acc, item) => {
		const name = item
			.replace('/index.js', '')
			.replace('src/mixins/', 'Mixins/')
		acc[name] = path.join(__dirname, item)
		return acc
	}, {}),
}
webpackConfig.output = {
	path: path.resolve(__dirname, './dist'),
	publicPath: '/dist/',
	filename: '[name].js',
	libraryTarget: 'umd',
	library: ['NextcloudVue', '[name]'],
	umdNamedDefine: true,
}
webpackConfig.externals = [nodeExternals()]

webpackConfig.plugins.push(new DefinePlugin({
	SCOPE_VERSION,
	TRANSLATIONS: JSON.stringify(translations),
}))
// Alias the default server assets path to link to local one
webpackConfig.resolve.alias = {
	'/core/css/../img': path.join(__dirname, 'styleguide/assets/img'),
	'/core/css/../fonts': path.join(__dirname, 'styleguide/assets/fonts'),
}
webpackRules.RULE_CSS = {
	test: /\.css$/,
	use: ['style-loader', 'css-loader', 'resolve-url-loader'],
}
webpackRules.RULE_SCSS = {
	test: /\.scss$/,
	use: [
		'style-loader',
		'css-loader',
		'resolve-url-loader',
		{
			loader: 'sass-loader',
			options: {
				additionalData: `$scope_version:${SCOPE_VERSION}; @import 'variables'; @import 'material-icons';`,
				/**
				 * ! needed for resolve-url-loader
				 */
				sourceMap: true,
				sassOptions: {
					sourceMapContents: false,
					includePaths: [
						path.resolve(__dirname, './src/assets'),
					],
				},
			},
		},
	],
}
webpackConfig.module.rules = Object.values(webpackRules)

module.exports = webpackConfig
