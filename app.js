import fs from 'node:fs'
import path from 'node:path'

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

const args = {
    in: parseArg('i', 'in'),
    out: parseArg('o', 'out')
};

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

const globInMarkdeep = fs.globSync(path.join(args.in, '**/*.md'));
const globInOther = fs.globSync(path.join(args.in, '**'))
    .filter(inputFile => !globInMarkdeep.find(x=>x===inputFile))
    .filter(inputFile => !fs.statSync(inputFile).isDirectory());

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

console.log(markdeepTransformPairs);
console.log(otherTransformPairs);

markdeepTransformPairs
    .map(p => path.dirname(p.out))
    .concat(otherTransformPairs.map(p => path.dirname(p.out)))
        .filter((v, i, a) => a.indexOf(v) === i)
        .forEach(dir => {
            if (!fs.existsSync(dir))
                fs.mkdirSync(dir, {recursive:true});
        });

otherTransformPairs.forEach(t => {
    fs.copyFile(t.in, t.out, fs.constants.COPYFILE_FICLONE, err => err && console.error(err));
});

markdeepTransformPairs.forEach(t => {
    fs.copyFile(t.in, t.out, fs.constants.COPYFILE_FICLONE, err => err && console.error(err));
});