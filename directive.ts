import { Directive, ElementRef, HostListener } from '@angular/core';

@Directive({
  selector: '[focusFirstElement]'
})
export class FocusElementDirective {

  constructor(private elRef: ElementRef) { }

  @HostListener('submit')
  onFormSubmit() {
    if (this.elRef && this.elRef.nativeElement && this.elRef.nativeElement[0]) {
      this.elRef.nativeElement[0].focus();
    }
  }

}
