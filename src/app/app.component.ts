import {ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit} from '@angular/core';
import {RxDbService} from '../core/services/rx-db.service';

/**
 * if you face the problems with cdr using rxdb plugin uncomment this import,
 * but it will add 140kb+ to the production bundle size
 */
// import 'zone.js/dist/zone-patch-rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent implements OnInit {
  title = 'rx-db';

  constructor(
    private dbService: RxDbService,
    private cdr: ChangeDetectorRef
  ) {
  }

  ngOnInit(): void {
    this.dbService.createDB().subscribe();
    const key: string = 'SOME_KEY1';
    const data: { name: string } = {name: 'Denis2'};
    const cacheTime: number = 2;
    setTimeout(() => {
      this.dbService.upsert<{ name: string }>(key, data, cacheTime).subscribe();
    }, 2000);

    setTimeout(() => {
      this.dbService.get<{ name: string }>(key).subscribe((data: { name: string }) => {
        console.log('Value from DB: ', data);
        this.title = data?.name;
        this.cdr.detectChanges();
      });
    }, 3000);

    setTimeout(() => {
      this.dbService.upsert<{ name: string }>(key, {name: 'Denis5'}, cacheTime).subscribe();
    }, 5000);

    setTimeout(() => {
      this.dbService.upsert<{ name: string }>(key, {name: 'Denis6'}, cacheTime).subscribe();
    }, 6000);
  }
}
