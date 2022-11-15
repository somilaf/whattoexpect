import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { from, Observable, of, Subscription } from 'rxjs';
import { filter, finalize, map, mergeMap, switchMap, tap } from 'rxjs/operators';
import { BasecomponentComponent } from 'src/app/shared/components/basecomponent.component';
import { ConfirmDialogComponent } from 'src/app/shared/components/modals/confirm-dialog/confirm-dialog.component';
import { ErrorDialogComponent } from 'src/app/shared/components/modals/error-dialog/error-dialog.component';
import { FileuploadService } from 'src/app/shared/services/fileupload.service';
import { PterminalService } from 'src/app/user/pterminal/pterminal.service';
import { PinDialogComponent } from 'src/app/user/pterminal/workersignindialog/workersignindialog.component';
import { RasporedService } from '../../op/raspored/raspored.service';
import { JobsonmachineService } from '../jobsonmachine/jobsonmachine.service';

@Component({
    selector: 'app-joblogstatus',
    templateUrl: './joblogstatus.component.html',
    styleUrls: ['./joblogstatus.component.scss']
})
export class JoblogstatusComponent extends BasecomponentComponent implements OnInit, AfterViewInit, OnDestroy {

    private _selectedJob: any;
    isLoading: boolean;
    private selectedJobSubscription: Subscription;
    private userRemoveSubscription: Subscription;
    private resursStopSubscription: Subscription;

    jobstatus: any[] = [
        { value: 0, viewValue: 'NEAKTIVNA' },
        { value: 1, viewValue: 'IMA USLOV' },
        { value: 2, viewValue: 'U RADU' },
        { value: 3, viewValue: 'ZAKLJUČENA' },
    ];

    constructor(
        private jms: JobsonmachineService,
        private rps: RasporedService,
        private pts: PterminalService,
        protected fus: FileuploadService,
        protected snackBar: MatSnackBar,
        protected dialog: MatDialog
    ) {
        super(fus, snackBar, dialog)
    }



    ngOnInit(): void {

    }


    onRadniNalogSelected(event) {
        if (event[0] && event[0]['acKey']) {
            this.isLoading = true;
            event[0]['acKeyRN'] = event[0]['acKey'];
            let sjob = event[0];
            this.selectedJobSubscription = this.rps.getPrnStatus(JSON.stringify({ acKeyRN: event[0]['acKey'] })).pipe(
                map(data => {
                    let operacije = this.resolveResult(data);
                    return operacije && operacije['data'] ? operacije['data'] : of(null)
                }),
                filter(operacije => operacije = operacije.filter(operacija => operacija.acIdentOper)),
                mergeMap(operacije => {
                    sjob['operacije'] = operacije;
                    return from(operacije)
                }),

                // from(operacije),
                mergeMap(operacije => {
                     return this.jms.getJobMatOperSast(event[0]['acKeyRN'], operacije['acIdentOper'].trim()).pipe(
                        map(data => {
                            let matSast = this.resolveResult(data);
                            if (matSast && matSast['data']) {
                                operacije['matSast'] = matSast;
                            }
                            return operacije
                        }))
                }),
                mergeMap(operacija => this.getStatusOperacije(operacija)),
                mergeMap(operacija => this.getOperacijaWorkers(operacija)),
                mergeMap(operacija => this.getResursJob(operacija)),
                finalize(() => {
                    sjob.operacije.sort((a, b) => {
                        return (+a.anSort) - (+b.anSort);
                    });
                    this.selectedJob = sjob;
                    this.isLoading = false;
                })
            ).subscribe();
        }
    }


    operStatus(status: number): Observable<any> {
        if (status !== NaN) {
            const ostatus = this.jms.operStatus(+status);
            return ostatus;
        }
    }

    onRemoveUser(event, worker, operacija): void {
        this.pts.setSubIsSpinning(true);
        const confirm = this.dialog.open(ConfirmDialogComponent, {
            width: '500px',
            data: { title: 'Odjava operatera', subtitle: 'DA LI STE SIGURNI?' }
        });
        this.userRemoveSubscription = confirm.afterClosed()
            .subscribe(data => {
                if (data === true) {
                    this.pts.removeUser(worker['logovan']).pipe(
                    ).subscribe(data => {
                        if (this.resolveResult(data)) {
                            worker.logovan = null;
                            this.pts.removeWorker(worker);
                            this.onRadniNalogSelected(this.selectedJob.acKeyRN);
                            this.getOperacijaWorkers(operacija).subscribe();
                        }
                        this.pts.setSubIsSpinning(false);
                    })
                }
            });
    }

    private getStatusOperacije(operacija): Observable<any> {
        operacija['status'] = operacija['anStatus'] ? this.operStatus(operacija['anStatus']) : null;
        return this.jms.getJobOperLog(operacija['acKeyRN'], operacija['acIdentOper']).pipe(
            map(data => {
                const log = this.resolveResult(data)
                if (log && log['data']) {
                    operacija['log'] = data['data'];
                    this.jms.calculateTotalMaterial(operacija);
                    // this.prijemService.getMeterVsKG(prn);
                    return operacija;
                }
            }))
    }

    private getOperacijaWorkers(operacija): Observable<IOperacija> {
        if (operacija['operateri']) {
            return this.pts.sviprijavljeni().pipe(
                map(data => {
                    const logovani = this.resolveResult(data)['data'];
                    operacija['logovani'] = [];
                    for (let logovan of logovani) {
                        if (logovan.acKeyRN === operacija['acKeyRN'] && operacija['acIdentOper'].trim() === logovan['acIdentOper'].trim()) {
                            operacija['logovani'].push(logovan);
                        }
                    }
                    operacija['logovani'].sort((a, b) => {
                        return (+a.anUserId) - (+b.anUserId);
                    });
                    Object.keys(operacija['operateri']).map(index => {
                        let radnik = operacija['operateri'][index]
                        radnik['selected'] = false;
                        radnik['logovan'] = false;
                        for (let logovan of logovani) {
                            if ((+radnik.anUserIns) === (+logovan.anUserId)) {
                                radnik['logovan'] = logovan;
                                radnik['mainOper'] = logovan.Operater;
                            }
                        }
                    })
                    return operacija;
                }))
        }
        else { return of(operacija) }
    }

    private getResursJob(operacija): Observable<IOperacija> {
        return this.pts.resursStatus().pipe(
            map(resursi => {
                const resursiuradu = this.resolveResult(resursi)['data'];
                if (resursiuradu && resursiuradu.length > 0) {
                    operacija['resursi'] = resursiuradu.filter(
                        resurs =>
                            +resurs.anResurs === +operacija['anResurs'].trim()
                    )
                }
                return of(operacija)
            }));
    }

    onStopResurs(event, operacija, resurs: any) {
        if (operacija.logovani.length === 0 && operacija.operateri && Object.keys(operacija.operateri).length === 0) {
            this.pts.setSubIsSpinning(true);
            const confirm = this.dialog.open(ConfirmDialogComponent, {
                width: '500px',
                data: { title: 'Odjava resursa', subtitle: 'DA LI STE SIGURNI?' }
            });
            this.resursStopSubscription = confirm.afterClosed()
                .subscribe(data => {
                    if (data === true) {
                        this.pts.stopResurs(resurs).pipe(
                        ).subscribe(data => {
                            if (this.resolveResult(data)) {
                                const confirm = this.dialog.open(ConfirmDialogComponent, {
                                    width: '500px',
                                    data: { title: 'PROMENA STATUSA NALOGA', subtitle: 'Promenite adekvatno status naloga' }
                                });
                            }
                            this.pts.setSubIsSpinning(false);
                        })
                    }
                });
        }
        else {
            this.dialog.open(ErrorDialogComponent, {
                width: '500px',
                data: {
                    errorMsg: 'Moraju da se izloguju svi radnici pre zaustavljanja resursa.'
                }
            });
        }
    }
}