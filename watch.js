import { exec } from 'child_process'
import { CronJob as cron } from 'cron'
import fs from 'fs'
import path from 'path'
import moment from 'moment'
import Q from 'q'

const crack = `\\rserver30\\rserver3.exe`
const x86 = `${process.env.windir}\\System32${crack}`
const x64 = `${process.env.windir}\\SysWOW64${crack}`

const cmd = (command, ignore) => {
  let def = Q.defer()
	exec(command, function(err, stdout) {
		if (!err || ignore) { def.resolve(stdout.toString()) } else { def.reject(false) }
	})
  return def.promise
}

let rserver = undefined
if (fs.existsSync(x86)) rserver = path.dirname(x86)
if (fs.existsSync(x64)) rserver = path.dirname(x64)

const stoptrial = `${rserver}\\.trialstop`

// Verify client
if (!process.env.windir) throw new Error(`Support windows only.`)
if (!rserver) throw new Error(`Windows is not Radmin Server 3.5`)
try {
	let chk = `${rserver}\\dirtest`
	if (!fs.existsSync(chk)) fs.mkdirSync(chk)
	if (fs.existsSync(chk)) fs.rmdirSync(chk)
} catch (e) {
	throw new Error(`Command prompt run without Administrator.`)
}
// Watch server
let jobWatch = () => {
	cmd('sc query rserver3').then(result => {
		let state = /STATE.*?:.*?\d+.*?(\w+)/ig.exec(fs.readFileSync('./dump.tmp'))
		return (state && state[1] === 'STOPPED') ? cmd('net start rserver3') : false
	}).then(result => {
		if(result) console.log(`${moment().format('DD-MM-YYYY HH:mm:ss')} Radmin Server service restarted.`)
	}).catch(e => {
		console.log(`The Radmin Server V3 service was not found.`)
	})
}

if (!fs.existsSync(stoptrial)) {
	console.log(`The Radmin Server V3 Crack...`)
	cmd('net stop rserver3', true).then(result => {
		console.log(`The Radmin Server V3 service was stopped successfully.`)
		fs.createReadStream(`./newtstop`).pipe(fs.createWriteStream(`${rserver}\\wsock32.dll`))
		fs.createReadStream(`./nts64helper`).pipe(fs.createWriteStream(`${rserver}\\nts64helper.dll`))
		return cmd('net start rserver3')
	}).then(result => {
		console.log(`The Radmin Server V3 service was started successfully.`)
		return cmd(`rundll32 ${rserver}\\wsock32.dll,ntskd`)
	}).then(result => {
		if (!fs.existsSync(stoptrial)) fs.mkdirSync(stoptrial)
		console.log(`The Radmin Server Watch...`)
		jobWatch()
	}).catch(e => {
		console.log(`error`, e)
	})
} else {
	console.log(`The Radmin Server Watch...`)
	jobWatch()
}
