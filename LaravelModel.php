<?php

namespace App;

use App\Model\Pantheon\PRaspored\PRaspored;
use App\User;
use Illuminate\Database\Eloquent\Model;

class Userinfo extends Model
{
    protected $primaryKey = "idUserInfo";

    const USERROLE = [ 'superadmin' => 5, 'admin' => 4, 'moderator' => 3, 'user' => 2, 'resurs' => 1];

    protected $fillable = [
        'userRole',
        'department',
        'username',
        'phone',
        'erpUID'
    ];

    // Getters and Setters
    public function setUserRoleAttribute($userRole)
    {
        if ($userRole !== '') {
            foreach (Userinfo::USERROLE as $key => $value) {
                if (strtolower($userRole) === $key) {
                    $this->attributes['userRole'] = $value;
                }
            };
        }
    }


    public function proizvod()
    {
        return $this->belongsTo(Proizvod::class, 'idProizvoda');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'idUserInfo ', 'id');
    }

    public function merenjes()
    {
        return $this->hasMany(Merenje::class, 'idMerenja');
    }

    public function uredjaj()
    {
        return $this->hasMany(Uredjaj::class, 'idUredjaja');
    }

    public function praspored()
    {
        return $this->hasMany(PRaspored::class, 'idPRasporeda');
    }
}
