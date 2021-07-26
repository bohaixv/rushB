const { window, StatusBarAlignment, workspace } = require('vscode')
const babel = require('@babel/core')
const { minify } = require("terser")
const path = require('path')

function activate(context) {
	const status = window.createStatusBarItem(StatusBarAlignment.Right, 999)
	context.subscriptions.push(status)

	context.subscriptions.push(window.onDidChangeActiveTextEditor(editor => calculateCurrentCompressedFileSize(editor, status)))
	context.subscriptions.push(workspace.onDidOpenTextDocument(document => calculateCurrentCompressedFileSize({ document }, status)))
	context.subscriptions.push(workspace.onDidSaveTextDocument(document => calculateCurrentCompressedFileSize({ document }, status)))
}

function calculateCurrentCompressedFileSize(editor, status) {
	// todo 检测 wxml 、wxs、 css 文件
	if(editor.document.uri.scheme !== 'file' || !(/\.js$/.test(editor.document.uri._fsPath) || /\.ts$/.test(editor.document.uri._fsPath))) {
		status.hide();
		return
	}

	const code = editor.document.getText()
	const fileNmae = path.basename(editor.document.uri._fsPath)

	compressFile(code, status, fileNmae)
}

function compressFile(code, status, fileNmae) {
	const optionsObject = {
		filename: fileNmae,
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
			['@babel/preset-typescript']
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
		status.text = '压缩后文件大小：' + sizeOf(res.code)
		status.color = '#FFFFFF'
		status.show();
	})
}

/**
 * UTF-8 是一种可变长度的 Unicode 编码格式，使用一至四个字节为每个字符编码
 *
 * 000000 - 00007F(128个代码)      0zzzzzzz(00-7F)                             一个字节
 * 000080 - 0007FF(1920个代码)     110yyyyy(C0-DF) 10zzzzzz(80-BF)             两个字节
 * 000800 - 00D7FF
   00E000 - 00FFFF(61440个代码)    1110xxxx(E0-EF) 10yyyyyy 10zzzzzz           三个字节
 * 010000 - 10FFFF(1048576个代码)  11110www(F0-F7) 10xxxxxx 10yyyyyy 10zzzzzz  四个字节
 * UTF-16 大部分使用两个字节编码，编码超出 65535 的使用四个字节
 * 000000 - 00FFFF  两个字节
 * 010000 - 10FFFF  四个字节
 * @param  {String} str
 * @param  {String} charset utf-8, utf-16
 * @return {Number}
 */
function sizeOf(str, charset = 'utf-8') {
    let total = 0;
    let charCode;
    let i;
    let len;

    charset = charset ? charset.toLowerCase() : '';

    if (charset === 'utf-16' || charset === 'utf16') {
        for (i = 0, len = str.length; i < len; i++) {
            charCode = str.charCodeAt(i);

            if (charCode <= 0xffff) {
                total += 2;
            } else {
                total += 4;
            }
        }
    } else {
        for (i = 0, len = str.length; i < len; i++) {
            charCode = str.charCodeAt(i);
            if (charCode <= 0x007f) {
                total += 1; // 127]
            } else if (charCode <= 0x07ff) {
                total += 2; // 2047]
            } else if (charCode <= 0xffff) {
                total += 3; // 65535]
            } else {
                total += 4;
            }
        }
    }
    return total;
}


module.exports = {
	activate
}
