import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'numcomma'
})
export class NumcommaPipe implements PipeTransform {

  transform(value: any, ...args: any[]): any {
    return String(value).replace('.', ',');
  }

}