import fs from 'node:fs'
import path from 'node:path'
import puppeteer from 'puppeteer'

const ColorReset = "\x1b[0m";
const ColorBright = "\x1b[1m";
const ColorDim = "\x1b[2m";
const ColorUnderscore = "\x1b[4m";
const ColorBlink = "\x1b[5m";
const ColorReverse = "\x1b[7m";
const ColorHidden = "\x1b[8m";

const ColorFgBlack = "\x1b[30m";
const ColorFgRed = "\x1b[31m";
const ColorFgGreen = "\x1b[32m";
const ColorFgYellow = "\x1b[33m";
const ColorFgBlue = "\x1b[34m";
const ColorFgMagenta = "\x1b[35m";
const ColorFgCyan = "\x1b[36m";
const ColorFgWhite = "\x1b[37m";
const ColorFgGray = "\x1b[90m";

const ColorBgBlack = "\x1b[40m";
const ColorBgRed = "\x1b[41m";
const ColorBgGreen = "\x1b[42m";
const ColorBgYellow = "\x1b[43m";
const ColorBgBlue = "\x1b[44m";
const ColorBgMagenta = "\x1b[45m";
const ColorBgCyan = "\x1b[46m";
const ColorBgWhite = "\x1b[47m";
const ColorBgGray = "\x1b[100m";

console.time(`${ColorFgCyan}create browser${ColorReset}`);
const browser = await puppeteer.launch();
console.timeEnd(`${ColorFgCyan}create browser${ColorReset}`);

async function transformMarkdeep(src, dest)
{
    const destFileCwdRelative = path.relative(process.cwd(), dest);
    console.time(`${ColorFgCyan}xform ${destFileCwdRelative}${ColorReset}`);
    
    const htmlIn = `<!DOCTYPE html><meta charset="utf-8">
${fs.readFileSync(src)}
<script>markdeepOptions = {};</script>
<!-- Markdeep: --><style class="fallback">body{visibility:hidden;white-space:pre;font-family:monospace}</style><script src="markdeep.min.js"></script><script src="https://casual-effects.com/markdeep/latest/markdeep.min.js?"></script><script>window.alreadyProcessedMarkdeep||(document.body.style.visibility="visible")</script>
`
    const page = await browser.newPage();
    await page.setContent(htmlIn, {waitUntil: 'networkidle0'});
    let html = await page.content();

    html = html.replaceAll('<script', '<!--script');
    html = html.replaceAll('</script>', '</script-->');

    fs.writeFileSync(dest, html);

    console.timeEnd(`${ColorFgCyan}xform ${destFileCwdRelative}${ColorReset}`);
}

function printHelp(printFunction=console.log) {
    printFunction(`usage: markdeep-static --in="./input_dir" --out"./output_dir"`);
}

function parseArg(short, long) {
    let result = '';
    for (let i = 1; i < process.argv.length; ++i) {
        if (process.argv[i].startsWith(`--${long}=`)) {
            result = process.argv[i].substring(`--${long}=`.length);
            if (result.length >= 2 && result.startsWith('"') && result.endsWith('"')) {
                result = result.substring(1, result.length-2);
            }
            return result;
        }
        else if (process.argv[i].startsWith(`-${short}=`)) {
            result = process.argv[i].substring(`-${short}=`.length);
            if (result.length >= 2 && result.startsWith('"') && result.endsWith('"')) {
                result = result.substring(1, result.length-2);
            }
            return result;
        }
        else if ((process.argv[i] === `--${long}`) && (i !== (process.argv.length-1))) {
            return process.argv[i+1];
            
        }
        else if ((process.argv[i] === `-${short}`) && (i !== (process.argv.length-1))) {
            return process.argv[i+1];
        }
    }
}

console.time(`${ColorFgCyan}parse arguments${ColorReset}`);
const args = {
    in: parseArg('i', 'in'),
    out: parseArg('o', 'out')
};
console.timeEnd(`${ColorFgCyan}parse arguments${ColorReset}`);

console.time(`${ColorFgCyan}error handling${ColorReset}`);
if (!args.in) {
    printHelp(console.error);
    process.exit(-1);
}
if (!args.out) {
    printHelp(console.error);
    process.exit(-1);
}
if (!fs.existsSync(args.in)) {
    console.error(`error: input doesn't exist. input: ${args.in}`);
    process.exit(-1);
}
if (!fs.existsSync(args.out)) {
    console.error(`error: output doesn't exist. output: ${args.out}`);
    process.exit(-1);
}
if (!fs.statSync(args.in).isDirectory()) {
    console.error(`error: input isn't a directory. input: ${args.in}`);
    process.exit(-1);
}
if (!fs.statSync(args.out).isDirectory()) {
    console.error(`error: output isn't a directory. output: ${args.out}`);
    process.exit(-1);
}
console.timeEnd(`${ColorFgCyan}error handling${ColorReset}`);

console.time(`${ColorFgGreen}markdeep-static${ColorReset}`); // overall

console.time(`${ColorFgCyan}glob markdeep${ColorReset}`);
const globInMarkdeep =  fs.globSync(path.join(args.in, '**/*.md'));
console.timeEnd(`${ColorFgCyan}glob markdeep${ColorReset}`);
console.time(`${ColorFgCyan}glob other${ColorReset}`);
const globInOther = fs.globSync(path.join(args.in, '**'))
    .filter(inputFile => !globInMarkdeep.find(x=>x===inputFile))
    .filter(inputFile => !fs.statSync(inputFile).isDirectory());
console.timeEnd(`${ColorFgCyan}glob other${ColorReset}`);

console.time(`${ColorFgCyan}build markdeep transformation pairs${ColorReset}`);
const markdeepTransformPairs = globInMarkdeep.map((inputFile) => {
    return { 
        in: path.resolve(inputFile),
        out: path.resolve(path.join(
                args.out,
                path.dirname(
                    path.relative(args.in, inputFile)
                ),
                path.basename(inputFile, '.md')+'.html'
            ))
    };
});
console.timeEnd(`${ColorFgCyan}build markdeep transformation pairs${ColorReset}`);

console.time(`${ColorFgCyan}build other transformation pairs${ColorReset}`);
const otherTransformPairs = globInOther.map((inputFile) => {
    return { 
        in: path.resolve(inputFile),
        out: path.resolve(path.join(
                args.out,
                path.dirname(
                    path.relative(args.in, inputFile)
                ),
                path.basename(inputFile)
            ))
    };
});
console.timeEnd(`${ColorFgCyan}build other transformation pairs${ColorReset}`);

console.time(`${ColorFgCyan}glob files to delete${ColorReset}`);
const filesToDelete = fs.globSync(path.join(args.out, '**'), { exclude: ['.git'] })
    .filter(existingPath => !fs.statSync(existingPath).isDirectory() )
    .map(existingPath => path.resolve(existingPath))
    .filter(existingPath => {
        return markdeepTransformPairs.indexOf(existingMarkdeepTransformPair => {
            return existingMarkdeepTransformPair.out == existingPath;
        }) !== -1;
    });

console.timeEnd(`${ColorFgCyan}glob files to delete${ColorReset}`);

// stats to print when finished:
let stats = {
    filesCopied: 0,
    filesTransformed: 0,
    filesDeleted: 0
};

console.time(`${ColorFgCyan}delete files${ColorReset}`);
filesToDelete.forEach(existingFile => {
    console.log(`rm ${path.relative(process.cwd(), existingFile)}`);
    fs.unlinkSync(existingFile);
    stats.filesDeleted++;
})
console.timeEnd(`${ColorFgCyan}delete files${ColorReset}`);

console.time(`${ColorFgCyan}make output directories${ColorReset}`);
markdeepTransformPairs
    // go through all of the directories in markdeepTransformPairs and 
    // otherTransformPairs and create any needed directories.
    .map(p => path.dirname(p.out))
    .concat(otherTransformPairs.map(p => path.dirname(p.out)))
        // remove any duplicates
        .filter((v, i, a) => a.indexOf(v) === i)
        // sort the directories longest to shortest (by number of folders)
        // this is to create as few calls to mkdir as possible
        // we only do that so we can write fewer lines of log output
        .sort((a,b) => {
            let pred = d => d.split('/').filter(seg => seg !== '');
            let countA = pred(a);
            let countB = pred(b);
            if (countA !== countB) return countA - countB;
            return a.localCompare(b);
        })
        // create any directories that don't already exist
        .forEach(dir => {
            if (!fs.existsSync(dir)) {
                console.log(`mkdir ${dir}`);
                fs.mkdirSync(dir, {recursive:true});
            }
        });
console.timeEnd(`${ColorFgCyan}make output directories${ColorReset}`);

console.time(`${ColorFgCyan}copy non-markdeep files${ColorReset}`);
otherTransformPairs.forEach(t => {
    console.log(`cp ${path.relative(process.cwd(), t.in)} -> ${path.relative(process.cwd(), t.out)}`);
    fs.copyFileSync(t.in, t.out, fs.constants.COPYFILE_FICLONE, err => err && console.error(err));
    stats.filesCopied++;
});
console.timeEnd(`${ColorFgCyan}copy non-markdeep files${ColorReset}`);

console.time(`${ColorFgCyan}transform markdeep${ColorReset}`);

for(let i = 0; i < markdeepTransformPairs.length; ++i) {
    if (fs.existsSync(markdeepTransformPairs[i].out)) {
        const inStat = fs.statSync(markdeepTransformPairs[i].in);
        const outStat = fs.statSync(markdeepTransformPairs[i].out);
        if (outStat.mtimeMs >= inStat.mtimeMs) {
            console.log(`skipping transform for ${path.relative(process.cwd(), markdeepTransformPairs[i].out)}`);
            continue;
        }
    }

    await transformMarkdeep(markdeepTransformPairs[i].in, markdeepTransformPairs[i].out);
    stats.filesTransformed++;
}
await browser.close();

console.timeEnd(`${ColorFgCyan}transform markdeep${ColorReset}`);

console.timeEnd(`${ColorFgGreen}markdeep-static${ColorReset}`); // overall

console.log(`----------------------------------------
transformed: ${stats.filesTransformed} copied: ${stats.filesCopied} deleted: ${stats.filesDeleted}
----------------------------------------
markdeep-static finished`);