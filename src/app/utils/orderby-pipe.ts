import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'orderBy',
  standalone: true
})
export class OrderByPipe implements PipeTransform {
  transform(items: any[], key: string, reverse: boolean = false): any[] {
    if (!items) return items;
    if (!key) return items;

    const sorted = [...items].sort((a, b) => {
      const valA = String(a[key]).toLowerCase();
      const valB = String(b[key]).toLowerCase();
      if (valA < valB) return -1;
      if (valA > valB) return 1;
      return 0;
    });

    return reverse ? sorted.reverse() : sorted;
  }
}