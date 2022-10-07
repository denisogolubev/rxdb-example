import {createRxDatabase, JsonSchema, RxCollectionBase, RxDatabase, RxDocument, RxJsonSchema} from 'rxdb';
import {getRxStorageDexie} from 'rxdb/plugins/dexie';
import {Injectable} from '@angular/core';
import {concatMap, from, map, Observable, of, tap} from 'rxjs';
import {environment} from '../../environments/environment';

/**
 * Plugin info
 * https://rxdb.info/
 * https://github.com/pubkey/rxdb
 *
 * Build size 364.56 kB
 * If add the cdr patch in app.component.ts then build size will be 518kb
 * This plugin is heavy and have Ivy warnings:
 *  "CommonJS or AMD dependencies can cause optimization bailouts."
 * But it has a lot of updates and support different browsers.
 */

interface IDBEntity<T = unknown> {
  key: string;
  cacheTime: string;
  data: T | string;
}

interface IDBProperties {
  key: JsonSchema;
  cacheTime: JsonSchema;
  data: JsonSchema;
}

@Injectable({providedIn: 'root'})
export class RxDbService {
  private readonly _COLLECTION_KEY: 'app' = 'app';
  private readonly _dbScheme: RxJsonSchema<IDBProperties> = {
    title: 'app-db-scheme',
    version: 0,
    description: 'App database scheme',
    type: 'object',
    primaryKey: 'data',
    properties: {
      key: {
        type: 'string'
      },
      cacheTime: {
        type: 'string'
      },
      data: {
        type: 'string'
      }
    },
    required: ['key', 'cacheTime', 'data']
  };
  private _db!: RxDatabase;

  public createDB(): Observable<any> {
    return from(
      createRxDatabase({
        name: 'app-db',
        storage: getRxStorageDexie()
      })
    ).pipe(
      concatMap((db: RxDatabase) => {
        this._db = db;

        // Set isDropDb to true when you need to drop DB
        const isDropDb: boolean = false;
        if (isDropDb) {
          return this.dropDB();
        }
        return this.createDBCollection();
      }),
      concatMap(this.logAllData.bind(this))
    );
  }

  private createDBCollection(): Observable<any> {
    return from(
      this._db.addCollections({
        [this._COLLECTION_KEY]: {
          schema: this._dbScheme
        }
      })
    );
  }

  public upsert<T>(key: string, data: T, cacheTime: number): Observable<RxDocument<any>> {
    return from(this.appCollection<T>().findOne({selector: {key}}).exec())
      .pipe(
        concatMap((document: RxDocument<any>) => {
          document && document.remove();
          return this.appCollection<T>().insert({
            key,
            cacheTime: new Date(new Date().setMinutes(new Date().getMinutes() + cacheTime)).toString(),
            data: JSON.stringify(data)
          });
        })
      );
  }

  /**
   * @param key
   * .findOne({selector: {key}}).$ if you need to check every change of this value in DB, it will works like a subject
   * .findOne({selector: {key}}).exec() to get current value from db
   */
  public get<T>(key: string): Observable<T> {
    return this.appCollection<T>().findOne({selector: {key}}).$
      .pipe(map((document: RxDocument<any>) => {
        try {
          return JSON.parse(document.get('data'));
        } catch (e) {
          console.error('Error in rx-db service', e);
          return document?.get('data');
        }
      }));
  }

  private logAllData(): Observable<any> {
    if (!environment.production) {
      return from(this.appCollection().find().exec())
        .pipe(
          tap((documents: RxDocument<any>[]) => {
            const data: IDBEntity[] = documents.map((document: RxDocument) => ({
              key: document.get('key'),
              cacheTime: document.get('cacheTime'),
              data: JSON.parse(document.get('data'))
            }));
            const style: string = 'background-color: green; font-size: 1.2rem; padding: 4px 8px; border-radius: 6px';
            console.log('%cLast cached data in Database', style);
            console.log(data);
          })
        );
    }
    return of(null);
  }

  private appCollection<T>(): RxCollectionBase<unknown, IDBEntity<T>> {
    return this._db[this._COLLECTION_KEY];
  }

  private dropDB(): Observable<string[]> {
    return from(this._db.remove());
  }
}
