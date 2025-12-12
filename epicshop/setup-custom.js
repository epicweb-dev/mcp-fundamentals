import path from 'node:path'
import {
	getApps,
	isProblemApp,
	setPlayground,
} from '@epic-web/workshop-utils/apps.server'
import { warm } from 'epicshop/warm'
import { execa } from 'execa'
import fsExtra from 'fs-extra'
import { globby } from 'globby'

await warm()
await runAllSeeds()

const allApps = await getApps()
const problemApps = allApps.filter(isProblemApp)

if (!process.env.SKIP_PLAYGROUND) {
	const firstProblemApp = problemApps[0]
	if (firstProblemApp) {
		console.log('🛝  setting up the first problem app...')
		const playgroundPath = path.join(process.cwd(), 'playground')
		if (await fsExtra.exists(playgroundPath)) {
			console.log('🗑  deleting existing playground app')
			await fsExtra.remove(playgroundPath)
		}
		await setPlayground(firstProblemApp.fullPath).then(
			() => {
				console.log('✅ first problem app set up')
			},
			(error) => {
				console.error(error)
				throw new Error('❌  first problem app setup failed')
			},
		)
	}
}

async function runAllSeeds() {
	try {
		// Find all seed.ts files in exercises directories
		const seedFiles = await globby('exercises/**/src/db/seed.ts')

		console.log(
			`🌱 Found ${seedFiles.length} seed files to run to get the databases ready.`,
		)
		for (const file of seedFiles.toSorted()) {
			// Get the exercise directory (3 levels up from src/db/seed.ts)
			const exerciseDir = path.dirname(path.dirname(path.dirname(file)))

			// Create the relative path to the seed file from the exercise directory
			const seedFilePath = path.relative(exerciseDir, file)

			const label = file.split('/').slice(1, 3).join('/')
			try {
				await execWithBufferedOutput('npx', ['tsx', seedFilePath], {
					cwd: exerciseDir,
				})
				console.log(`  ✓ Seeded ${label}`)
			} catch (error) {
				console.error(`❌ Seeding failed for ${label}:`, error.message)
				throw error
			}
		}

		console.log('✅ All seeds completed.')
	} catch (error) {
		console.error('❌ Seeding process failed:', error.message)
		throw error
	}
}

/**
 * Execute a command with buffered output that only displays if there's an error
 */
async function execWithBufferedOutput(command, args, options = {}) {
	return new Promise((resolve, reject) => {
		const outputBuffer = []

		function addToBuffer(channel, data) {
			outputBuffer.push({ channel, data })
		}

		function printBufferedOutput() {
			// Print all buffered output in sequence
			for (const { channel, data } of outputBuffer) {
				const str = data.toString()
				if (channel === 'stdout') {
					process.stdout.write(str)
				} else if (channel === 'stderr') {
					process.stderr.write(str)
				}
			}
		}

		const childProcess = execa(command, args, options)

		function bufferStdout(data) {
			addToBuffer('stdout', data)
		}

		function bufferStderr(data) {
			addToBuffer('stderr', data)
		}

		childProcess.stdout.on('data', bufferStdout)
		childProcess.stderr.on('data', bufferStderr)

		childProcess.on('error', (err) => {
			printBufferedOutput()
			reject(err)
		})

		childProcess.on('exit', (code) => {
			if (code !== 0) {
				printBufferedOutput()
				reject(
					new Error(
						`Command "${command} ${args.join(' ')}" exited with code ${code}`,
					),
				)
			} else {
				resolve()
			}
		})
	})
}
