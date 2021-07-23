const { window, StatusBarAlignment, workspace } = require('vscode')
const babel = require('@babel/core');
const { minify } = require("terser");

function activate(context) {
	const status = window.createStatusBarItem(StatusBarAlignment.Right, 999)
	context.subscriptions.push(status)

	context.subscriptions.push(window.onDidChangeActiveTextEditor(editor => calculateCurrentCompressedFileSize(editor, status)))
	context.subscriptions.push(workspace.onDidOpenTextDocument(document => calculateCurrentCompressedFileSize({ document }, status)))
	context.subscriptions.push(workspace.onDidSaveTextDocument(document => calculateCurrentCompressedFileSize({ document }, status)))
}

function calculateCurrentCompressedFileSize(editor, status) {
	if(editor.document.uri.scheme !== 'file' || !/\.js$/.test(editor.document.uri._fsPath)) {
		status.hide();
		return
	}

	const code = editor.document.getText()

	compressFile(code, status)
}

function compressFile(code, status) {
	const optionsObject = {
		presets: [
			// wxPreset,
			[
				'@babel/preset-env',
				{
					targets: {
						browsers: ['safari >= 10', 'android >= 5.0'],
					},
					modules: 'commonjs',
					loose: true,
				},
			],
		],
		comments: false,
		plugins: [
			'macros',
			[
				'@babel/plugin-proposal-decorators',
				{
					legacy: true,
				},
			],
			'@babel/plugin-syntax-dynamic-import',
			'@babel/plugin-syntax-import-meta',
			'@babel/plugin-proposal-class-properties',
			'@babel/plugin-proposal-json-strings',
			'@babel/plugin-proposal-function-sent',
			'@babel/plugin-proposal-export-namespace-from',
			'@babel/plugin-proposal-numeric-separator',
			'@babel/plugin-proposal-throw-expressions',
			'@babel/plugin-proposal-export-default-from',
			'@babel/plugin-proposal-logical-assignment-operators',
			'@babel/plugin-proposal-optional-chaining',
			[
				'@babel/plugin-proposal-pipeline-operator',
				{
					proposal: 'minimal',
				},
			],
			'@babel/plugin-proposal-nullish-coalescing-operator',
			'@babel/plugin-proposal-do-expressions',
			'@babel/plugin-proposal-function-bind',
			[
				'@babel/plugin-transform-runtime',
				{
					corejs: false,
					helpers: true,
					regenerator: true,
					useESModules: false,
				},
			],
			[
				'transform-define',
				{
					'process.env.NODE_ENV': 'production',
					// 'process.env.PERFORMANCE_DEBUG': process.env.PERFORMANCE_DEBUG
				},
			],
		],
	};

	const transformedCode = babel.transformSync(code, optionsObject);

	minify(transformedCode.code, {
		module: true,
		compress: {},
		mangle: {},
		output: {},
		parse: {},
	}).then(res => {

		status.tooltip = '压缩后文件大小单位（B）'
		status.text = '压缩后文件大小：' + res.code.length
		status.color = '#FFFFFF'
		status.show();
	})
}

module.exports = {
	activate
}
