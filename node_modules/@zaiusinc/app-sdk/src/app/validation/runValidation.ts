import chalk from 'chalk';
import * as path from 'path';

import {Runtime} from '../Runtime';
import {validateApp} from './validateApp';

Runtime.initialize(path.resolve(process.cwd(), 'dist'), true)
  .then(async (runtime) => {
    try {
      const errors = await validateApp(runtime);
      if (errors.length > 0) {
        console.error(chalk.red(`Validation failed:\n${errors.map((e) => ` * ${e}`).join('\n')}`));
        process.exit(1);
      } else {
        console.log(chalk.green('Looks good to me'));
      }
    } catch (e: any) {
      console.error(chalk.red(`Validation process failed: ${e.message}`));
      process.exit(1);
    }
  })
  .catch((e: any) => {
    console.error(chalk.red(`Validation process failed: ${e.message}`));
    process.exit(1);
  });
