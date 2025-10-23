/**
 * Sample file contents for testing
 */

const validTypeScriptFile = `
import React from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  title: string;
  count: number;
}

export function Counter({ title, count }: Props) {
  return (
    <div>
      <h1>{title}</h1>
      <p>Count: {count}</p>
      <Button>Click me</Button>
    </div>
  );
}
`;

const typeScriptWithErrors = `
import React from 'react';

interface Props {
  title: string;
}

export function Counter({ title }: Props) {
  const count: string = 123; // Type error
  return <div>{title} - {count}</div>;
}
`;

const validImports = `
import React from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import utils from './utils';
import config from '../config';
`;

const invalidImports = `
import React from 'react';
import { Button } from '@/components/ui/nonexistent';
import utils from './nonexistent-file';
`;

const eslintErrors = `
const x=1+2
const y = 3
function foo(){
return x+y
}
`;

const prettierUnformatted = `
const x = {a:1,b:2,c:3};
function foo(  ){
return x;
}
`;

export {
  validTypeScriptFile,
  typeScriptWithErrors,
  validImports,
  invalidImports,
  eslintErrors,
  prettierUnformatted
};
