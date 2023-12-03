// 打包的脚本文件

const path = require('path')

const esbuild = require('esbuild')

const args = require('minimist')(process.argv.slice(2)) // 导入 minimist  解析命令行输入的参数
console.log(args)

// 要打包的模块是什么
const target = args._[0] || 'reactivity'
// 要被打包成为的格式
const format = args.f || 'global'

// 读取 target 包的 package.json 文件
const pkg = require(path.resolve(__dirname, `../packages/${target}/package.json`))
// console.log(pkg)

// 最终打包输出文件的语法格式：根据 format 来决定：fromat 为 global 则格式为 iife；format 为 cjs，则格式为 cjs； 否则格式为 esm
const outputFormat = format.startsWith('global') ? 'iife' : format === 'cjs' ? 'cjs' : 'esm'

// 最终打包输出的文件存放路径以及文件名称
// reactivity.global.js   reactivity.esm.js  reactivity.cjs.js
const outfile = path.resolve(__dirname, `../packages/${target}/dist/${target}.${format}.js`)
// console.log(outputFile)

// 配置 esbuild 打包
esbuild
	.context({
		// 要被打包的包的入口文件
		entryPoints: [path.resolve(__dirname, `../packages/${target}/src/index.ts`)],
		// 要被输出的打包结果的路径及文件名
		outfile,
		bundle: true,
		sourcemap: true,
		// 被输出的文件格式
		format: outputFormat,
		// 全局时的名称
		globalName: pkg.buildOptions?.name,
		platform: format === 'cjs' ? 'node' : 'browser',
	})
	.then((ctx) => ctx.watch())
