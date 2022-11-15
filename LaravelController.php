<?php

namespace App\Http\Controllers\Pantheon\PTerminal;

use Exception;
use Carbon\Carbon;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;
use Illuminate\Http\Request;
use Maatwebsite\Excel\Excel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use App\Http\Controllers\ApiController;
use Illuminate\Http\Exceptions\HttpResponseException;
use App\Http\Requests\Pantheon\PTerminal\AddWorkRequest;
use App\Http\Requests\Pantheon\PTerminal\GetPovratTotal;
use App\Http\Requests\Pantheon\PTerminal\LastPalletRequest;
use App\Http\Requests\Pantheon\PTerminal\ReportRollsRequest;
use App\Http\Requests\Pantheon\PTerminal\CheckLocationRequest;
use App\Http\Requests\Pantheon\PTerminal\DataCollectOpenRequest;
use App\Http\Requests\Pantheon\PTerminal\GetLastInsertSNRequest;
use App\Http\Requests\Pantheon\PTerminal\SendToWareHouseRequest;

class PTerminalController extends ApiController
{
    public function rnDataCollectOpen(DataCollectOpenRequest $request)
    {
        try {
            $data = $request->all();
            $response = Http::post('http://192.168.16.11/api/work.asmx/AddUserWeb', [
                'cKeyPlan' => $data['acKeyPlan'],
                'nNoPlan' => $data['anNoPlan'],
                'cIdentP' => $data['acIdentP'],
                'cIdentOper' => $data['acIdentOper'],
                'cKeyRN' => $data['acKeyRN'],
                'nResurs' => $data['anResurs'],
                'nUserId' => $data['anUserId']
            ]);
            if ($response->failed() || $response->serverError()) {
                return $this->pantheonResponse($response->body());
            }
            if ($response->successful()) {
                return $this->pantheonResponse($response->body());
            }
            // return $this->successResponse($url, 200);
        } catch (Exception $e) {
            return $this->errorResponse('Došlo je do greške' . $e, 403);
        }
    }

  
    public function getPovratTotal(GetPovratTotal $request)
    {
        try {
            $data = $request->all();
            $sns = DB::connection('sqlsrv')->table('_UR_WOExItemWorkLog', 'uwl')
                ->select(
                    'uwl.acLocationIdent',
                    'uwl.acLocation',
                )
                ->selectRaw("SUM(case when uwl.acType like 'USE' then uwl.acIdentMatInOut
                    when uwl.acType like 'RET' then -uwl.acIdentMatInOut
                    end) as totalKg")
                ->selectRaw("SUM(case when uwl.acType like 'USE' then uwl.acIdentLenInOut
                when uwl.acType like 'RET' then -uwl.acIdentLenInOut
                end) as totalMet")
                ->where([
                    ['uwl.acKeyRN', 'like', $data['acKeyRN']],
                    ['uwl.acIdentOper', 'like', $data['acIdentOper'] . '%'],
                    ['uwl.acLocationIdent', 'like', $data['acLocationIdent'] . '%'],
                ])
                ->whereIn('uwl.acType', json_decode($data['acType'], true))
                ->groupBy(['uwl.acLocationIdent', 'uwl.acLocation', 'uwl.anNo'])
                ->orderBy('uwl.anNo', 'desc')
                ->get();
            return $this->successResponse($sns, 200);
        } catch (Exception $e) {
            return $this->errorResponse('Došlo je do greške' . $e, 403);
        }
    }

   }


    private function GetAllLoggedUsers()
    {
        try {
            $collect = DB::connection('sqlsrv')
                ->table('_UR_WOExItemWorkUsers', 'uwu')
                ->leftJoin('_UR_WOExItemWorkResurs as uwr', function ($join) {
                    $join->on('uwr.anUserId', '=', 'uwu.anUserId');
                    $join->on('uwu.acKeyRN', '=', 'uwr.acKeyRN');
                    $join->on('uwu.anResurs', '=', 'uwr.anResurs');
                })
                ->leftJoin('tHE_SetSubjContact as ssc', 'uwu.anUserId', 'like', 'ssc.anUserID')
                ->select('uwu.anUserId','uwu.acKeyPlan', 'uwu.anNoPlan', 'uwu.acIdentP', 'uwu.acIdentOper', 'uwu.acKeyRN', 'uwu.anResurs')
                ->selectRaw("(RTRIM(ssc.acName)+' '+RTRIM(ssc.acSurname)) as KORISNIK")
                ->selectRaw('count(uwr.anUserId) as Operater')
                ->groupBy(['uwu.anUserId','uwu.acKeyPlan', 'uwu.anNoPlan', 'uwu.acIdentP', 'uwu.acIdentOper', 'uwu.acKeyRN', 'uwu.anResurs','ssc.acName','ssc.acSurname'])
                ->orderBy('Operater', 'desc')
                ->get();

                $collect->map(function ($item, $key) {
                   $item->anUserId = (int)$item->anUserId;
                   $item->anNoPlan = (int)$item->anNoPlan;
                   $item->anResurs = (int)$item->anResurs;
                   $item->Operater = (int)$item->Operater;
                });
            return $collect;
        } catch (Exception $e) {
            return $e;
        }
    }

    public function RemoveUser(DataCollectOpenRequest $request)
    {
        try {
            $data = $request->all();
            $response = Http::post('http://192.168.16.11/api/work.asmx/RemoveUser', [
                'cKeyPlan' => $data['acKeyPlan'],
                'nNoPlan' => $data['anNoPlan'],
                'cIdentP' => $data['acIdentP'],
                'cIdentOper' => $data['acIdentOper'],
                'cKeyRN' => $data['acKeyRN'],
                'nResurs' => $data['anResurs'],
                'nUserId' => $data['anUserId']
            ]);
            if ($response->failed() || $response->serverError()) {
                return $this->errorResponse('Došlo je do greške u upitu', 403);
            }
            if ($response->successful()) {
                return $this->pantheonResponse($response->body());
            }
            // return $this->successResponse($url, 200);
        } catch (Exception $e) {
            return $this->errorResponse('Došlo je do greške' . $e, 403);
        }
    }
}