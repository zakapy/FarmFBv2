import React, { useState } from 'react';
import './AccountCard.css';
import './Button.css';
import './Spinner.css';
import API from '../api/axios';
import { API as ENDPOINTS } from '../api/endpoints';
import { toast } from 'react-toastify';
import Button from './Button';
import AccountForm from './AccountForm';
import AvatarUploader from './AvatarUploader';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPen, faTrash, faSync, faKey, faCheck, faUserCheck, faUserTimes, faCookieBite } from '@fortawesome/free-solid-svg-icons';

const AccountCard = ({ account, onEdit, onDelete, refreshAccounts }) => {
  const [status, setStatus] = useState(account.status || 'неизвестно');
  const [checkState, setCheckState] = useState('idle'); // idle | loading | success | error
  const [syncState, setSyncState] = useState('idle'); // idle | loading | success | error
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [authState, setAuthState] = useState('idle'); // idle | loading | success | error
  const [cookieState, setCookieState] = useState('idle'); // idle | loading | success | error
  const [twoFACode, setTwoFACode] = useState('');

  const cookiesOk = Array.isArray(account.cookies) && account.cookies.length > 0;
  const proxy = typeof account.proxy === 'string' ? account.proxy : (account.proxy?.name || '');
  const hasDolphinProfile = account.dolphin && account.dolphin.profileId;
  const needs2FA = account.meta && account.meta.requires2FA;
  const hasAuthData = account.meta && account.meta.email;
  const avatarUrl = account.meta?.avatarUrl || '';

  const renderStatus = () => {
    switch (status?.toLowerCase()) {
      case 'активен':
      case 'active':
        return <span style={{ color: 'green' }}>🟢 Активен</span>;
      case 'неактивен':
      case 'inactive':
        return <span style={{ color: 'red' }}>🔴 Неактивен</span>;
      default:
        return <span style={{ color: 'gray' }}>⚪ Неизвестно</span>;
    }
  };

  const handleCheckStatus = async () => {
    setCheckState('loading');
    try {
      const res = await API.post(`/api/v1/accounts/${account._id || account.id}/check`);
      
      // ✅ Получаем статус из ответа
      const newStatus = res.data?.status?.toLowerCase();
  
      // ✅ Устанавливаем его в локальный стейт
      if (newStatus === 'активен' || newStatus === 'неактивен') {
        setStatus(newStatus);
      }
      
      // Если нужно повторно войти с сохраненными данными
      if (res.data.requiresCredentials && res.data.message) {
        toast.warning(res.data.message);
        
        // Если есть сохраненные данные для входа, предложим авторизоваться
        if (hasAuthData) {
          const shouldLogin = window.confirm('Выполнить авторизацию с сохраненными учетными данными?');
          if (shouldLogin) {
            await handleRelogin();
          }
        }
      }
  
      setCheckState('success');
      setTimeout(() => setCheckState('idle'), 2000);
    } catch (err) {
      console.error(err);
      setCheckState('error');
      setTimeout(() => setCheckState('idle'), 2000);
    }
  };

  const handleRelogin = async () => {
    if (!hasAuthData) {
      toast.error('Нет сохраненных данных для авторизации');
      return;
    }
    
    setAuthState('loading');
    try {
      // Запрашиваем пароль у пользователя, так как мы не храним его
      const password = window.prompt('Введите пароль для входа в Facebook:');
      
      if (!password) {
        toast.warning('Авторизация отменена: пароль не указан');
        setAuthState('idle');
        return;
      }
      
      // Отправляем запрос на авторизацию через Dolphin
      const res = await API.post(`/api/v1/accounts/${account._id || account.id}/relogin`, {
        password
      });
      
      if (res.data.requires2FA) {
        toast.warning('Требуется верификация 2FA');
        setShow2FAModal(true);
      } else if (res.data.success) {
        toast.success(res.data.message || 'Аккаунт успешно авторизован');
        setStatus('активен');
        
        // Обновляем список аккаунтов
        if (refreshAccounts) {
          refreshAccounts();
        }
      } else {
        toast.error(res.data.message || 'Не удалось авторизоваться');
      }
      
      setAuthState('success');
      setTimeout(() => setAuthState('idle'), 2000);
    } catch (err) {
      console.error('Ошибка авторизации:', err);
      toast.error(err.response?.data?.message || 'Ошибка авторизации');
      setAuthState('error');
      setTimeout(() => setAuthState('idle'), 2000);
    }
  };

  const handle2FAVerify = async (data) => {
    try {
      const res = await API.post(`/api/v1/accounts/${account._id || account.id}/verify-2fa`, data);
      
      if (res.data.success) {
        toast.success('2FA успешно подтвержден!');
        setShow2FAModal(false);
        
        // Обновляем список аккаунтов
        if (refreshAccounts) {
          refreshAccounts();
        }
        
        return res.data;
      }
    } catch (err) {
      console.error('Ошибка верификации 2FA:', err);
      toast.error(err.response?.data?.error || 'Ошибка верификации 2FA');
      throw err;
    }
  };

  const handleSyncDolphin = async () => {
    setSyncState('loading');
    try {
      const res = await API.post(`/api/v1/accounts/${account._id || account.id}/sync-dolphin`);
      
      toast.success(res.data.message || 'Профиль успешно создан в Dolphin Anty');
      setSyncState('success');
      setTimeout(() => setSyncState('idle'), 2000);
      
      // Обновляем список аккаунтов
      if (refreshAccounts) {
        refreshAccounts();
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Ошибка синхронизации с Dolphin Anty');
      setSyncState('error');
      setTimeout(() => setSyncState('idle'), 2000);
    }
  };

  const handleCookieImport = async () => {
    if (!hasDolphinProfile) {
      toast.error('Необходимо сначала создать профиль в Dolphin');
      return;
    }

    setCookieState('loading');
    try {
      // Используем axios и наш API вместо fetch напрямую
      const profileId = account.dolphin.profileId;
      
      // Здесь используем наш API, который будет выполнять запрос от имени клиента
      const res = await API.post(`/api/v1/accounts/${account._id || account.id}/import-cookies`, {
        profileId: profileId,
        data: [
          "https://www.vice.com/",
          "http://www.lifedaily.com/",
          "https://flickr.com/",
          "https://www.box.com/",
          "https://www.kapanlagi.com/",
          "https://gyazo.com/",
          "http://lifehacker.com/",
          "https://hh.ru/",
          "https://www.infobae.com/america/",
          "https://www.itmedia.co.jp/",
          "https://roaring.earth/",
          "https://www.mynet.com/",
          "https://prom.ua/",
          "https://www.hmyquickconverter.com/",
          "http://www.jawabkom.com/",
          "https://www.besoccer.com/",
          "https://assine.abril.com.br/?redirect=abrilcom",
          "https://www.bastillepost.com/hongkong",
          "https://www.icims.com/",
          "https://www.lavanguardia.com/",
          "https://www.sanook.com/",
          "https://www.sporx.com/",
          "https://www.mundodeportivo.com/",
          "https://www.eurogamer.net/",
          "https://www.incruit.com/",
          "https://www.bankbazaar.com/",
          "https://www.unc.edu/",
          "https://hemailaccessonline.com/",
          "https://front.wemakeprice.com/main",
          "https://www.indiegogo.com/",
          "https://minuto30.com/",
          "https://msu.edu/",
          "https://www.sarayanews.com/",
          "https://www.cafe24.com/",
          "https://www.jhu.edu/",
          "https://www.protothema.gr/",
          "https://www.islamweb.net/ar/",
          "http://www.hearthstonetopdecks.com/",
          "https://www.thekitchn.com/",
          "https://www.mcgill.ca/",
          "http://gamme.com.tw/",
          "https://redlink.com.ar/",
          "https://www.alamy.com/",
          "https://jang.com.pk/",
          "https://www.bluewin.ch/de/index.html",
          "https://www.deloitte.com/uk/en.html",
          "http://syri.net/",
          "https://www.giga.de/",
          "https://socorder.com/",
          "https://www.zdnet.com/",
          "https://unwire.hk/",
          "https://www.rockpapershotgun.com/",
          "https://wustl.edu/",
          "https://www.record.pt/",
          "http://popcornvod.com/",
          "https://www.sopitas.com/",
          "https://russian7.ru/",
          "https://www.24sata.hr/",
          "https://searchipdf.com/",
          "https://www.kocpc.com.tw/",
          "https://uwo.ca/",
          "https://eu.mouser.com/",
          "https://www.jawharafm.net/ar/",
          "http://www.iloveoldschoolmusic.com/",
          "https://www.superteacherworksheets.com/",
          "https://searchdconvertnow.com/",
          "https://svpressa.ru/",
          "https://www.ldoceonline.com/",
          "https://mingpao.com/",
          "https://www.apartmenttherapy.com/",
          "https://soha.vn/",
          "https://www.futbolarena.com/",
          "https://www.carsensor.net/",
          "https://www.dcfever.com/",
          "https://www.filefactory.com/",
          "https://secure.imvu.com/",
          "https://ethplorer.io/",
          "https://www.programiz.com/",
          "https://www.a-q-f.com/openpc/USA0000S01.do",
          "https://sc.edu/",
          "https://healthylives.tw/",
          "https://www.hattrick.org/en-us/",
          "https://www.gamespark.jp/",
          "https://fineartamerica.com/",
          "https://e-gov.az/",
          "https://unacademy.com/",
          "https://newpost.gr/",
          "https://www.vcommission.com/",
          "https://www.click108.com.tw/",
          "https://www.gigabyte.com/",
          "https://bpjs-kesehatan.go.id/",
          "https://flexmls.com/",
          "https://www.pravda.sk/",
          "https://www.resultados-futbol.com/",
          "https://www.compass.education/",
          "https://fstoppers.com/",
          "https://trafficnews.jp/",
          "https://sprzedajemy.pl/",
          "https://www.smule.com/",
          "https://www.jvzoo.com/",
          "https://sneakernews.com/",
          "https://www.upmedia.mg/",
          "https://www.nationalreview.com/",
          "https://www.aceenggacademy.com/",
          "https://manychat.com/",
          "https://www.mundo.com/",
          "https://www.enuri.com/",
          "https://www.bikewale.com/",
          "https://www.practo.com/",
          "https://www.omelete.com.br/",
          "https://www.thegradcafe.com/",
          "https://www.cmjornal.pt/",
          "https://remitano.com/",
          "https://www.vccs.edu/",
          "https://electroneum.com/",
          "https://president.jp/",
          "https://smartlink.media/",
          "https://retty.me/",
          "https://futurenet.club/",
          "https://response.jp/",
          "https://litnet.com/",
          "https://www.fshare.vn/",
          "http://takprosto.cc/",
          "https://www.free-power-point-templates.com/",
          "https://www.inside.com.tw/",
          "https://thegioinoithat.com/",
          "https://myamcat.com/",
          "https://www.2banh.vn/",
          "https://mymoneytimes.com/",
          "https://www.ultrasawt.com/",
          "https://satu.kz/",
          "https://www.sidefx.com/",
          "https://www.snowdaycalculator.com/calculator.php",
          "https://www.youth4work.com/",
          "https://www.haaretz.com/",
          "https://www.idrlabs.com/",
          "https://www.poste.dz/",
          "https://www.sportsv.net/",
          "https://www.chilevision.cl/",
          "https://www.thaiware.com/",
          "https://www.egypt-today.com/",
          "https://heasyspeedtest.co/",
          "https://siol.net/",
          "https://cryptopanic.com/",
          "http://airvuz.com/",
          "https://www.autocarindia.com/",
          "https://wowwo.com/",
          "https://www.jpost.com/",
          "https://gogo.mn/",
          "https://wormate.io/",
          "https://clarivate.com/",
          "http://www.dingit.tv/",
          "https://www.bc.edu/",
          "https://www.xserver.ne.jp/",
          "https://transdoc.com/",
          "https://eng.lottedfs.com/kr/shopmain/home?gatePopUpYn=Y",
          "https://www.tudocelular.com/",
          "https://www.sinoptik.bg/london-great-britain-102643743?location",
          "https://icotto.jp/",
          "https://www.nla.gov.au/",
          "https://bilimland.kz/kk",
          "https://www.salary.com/",
          "https://multiplayer.it/",
          "https://eiga.com/",
          "https://www.cuantarazon.com/",
          "https://www.unipd.it/",
          "https://www.slb.com/",
          "https://www.pizap.com/",
          "https://wlu.ca/",
          "https://ek.ua/",
          "https://eternallifestyle.com/",
          "https://www.mercantil.com/",
          "https://brobible.com/",
          "https://walletinvestor.com/",
          "https://www.jobs77.com/",
          "https://www.cool-style.com.tw/wd2/",
          "https://www.otofun.net/",
          "https://www.hinode.com.br/",
          "https://www.viewbug.com/",
          "https://www.hktvmall.com/",
          "https://10x10.co.kr/index.asp",
          "https://hh.kz/",
          "https://deal.by/",
          "https://www.trt1.com.tr/",
          "https://www.rescuetime.com/",
          "https://pytorch.org/",
          "https://in.via.com/",
          "https://www.thestranger.com/",
          "https://www.yupptv.com/",
          "https://www.bitlanders.com/",
          "http://www.thefader.com/",
          "https://www.beliefnet.com/",
          "https://searchgst.com/",
          "https://www.ert.gr/",
          "https://www.coolstuffinc.com/",
          "https://thehungryjpeg.com/",
          "https://jne.co.id/",
          "https://www.moto.it/",
          "https://kfupm.edu.sa/",
          "https://www.consumeraffairs.com/"
        ],
        headless: false,
        imageless: true
      });

      if (res.data.success) {
        toast.success('Куки успешно нагуляны!');
        setCookieState('success');
      } else {
        toast.error(res.data.message || 'Не удалось нагулять куки');
        setCookieState('error');
      }
      
      setTimeout(() => setCookieState('idle'), 2000);
    } catch (err) {
      console.error('Ошибка нагуливания куки:', err);
      toast.error('Ошибка нагуливания куки: ' + (err.response?.data?.message || err.message || 'Неизвестная ошибка'));
      setCookieState('error');
      setTimeout(() => setCookieState('idle'), 2000);
    }
  };

  const renderDolphinInfo = () => {
    if (hasDolphinProfile) {
      return (
        <p><strong>Dolphin ID:</strong> <span style={{ color: 'blue' }}>🐬 #{account.dolphin.profileId}</span></p>
      );
    }
    return null;
  };

  const renderCheckButton = () => {
    switch (checkState) {
      case 'loading':
        return (
          <button className="btn default" disabled>
            <span className="spinner small"></span>
            <span>Проверка...</span>
          </button>
        );
      case 'success':
        return (
          <button className="btn success" disabled>
            ✅ Готово!
          </button>
        );
      case 'error':
        return (
          <button className="btn error" disabled>
            ❌ Ошибка
          </button>
        );
      default:
        return (
          <button className="btn default" onClick={handleCheckStatus}>
            🔍 Проверить
          </button>
        );
    }
  };

  const renderSyncButton = () => {
    if (hasDolphinProfile) {
      return null; // Уже синхронизирован
    }

    switch (syncState) {
      case 'loading':
        return (
          <button className="btn default" disabled>
            <span className="spinner small"></span>
            <span>Создание профиля...</span>
          </button>
        );
      case 'success':
        return (
          <button className="btn success" disabled>
            ✅ Профиль создан
          </button>
        );
      case 'error':
        return (
          <button className="btn error" disabled>
            ❌ Ошибка
          </button>
        );
      default:
        return (
          <button className="btn secondary" onClick={handleSyncDolphin}>
            🐬 Создать в Dolphin
          </button>
        );
    }
  };

  const renderAuthButton = () => {
    if (!hasAuthData) {
      return null;
    }

    switch (authState) {
      case 'loading':
        return (
          <button className="btn auth-btn" disabled>
            <span className="spinner small"></span>
            <span>Авторизация...</span>
          </button>
        );
      case 'success':
        return (
          <button className="btn success" disabled>
            ✅ Успешно!
          </button>
        );
      case 'error':
        return (
          <button className="btn error" disabled>
            ❌ Ошибка
          </button>
        );
      default:
        return (
          <button className="btn auth-btn" onClick={handleRelogin}>
            🔑 Авторизоваться
          </button>
        );
    }
  };

  const render2FABadge = () => {
    if (needs2FA) {
      return (
        <div className="twofa-badge">
          🔐 Требуется 2FA
          <button 
            className="btn-small"
            onClick={() => setShow2FAModal(true)} 
            title="Подтвердить 2FA"
          >
            Подтвердить
          </button>
        </div>
      );
    }
    return null;
  };

  const renderCookieButton = () => {
    if (!hasDolphinProfile) {
      return null; // Кнопка доступна только если есть профиль Dolphin
    }

    switch (cookieState) {
      case 'loading':
        return (
          <button className="btn default" disabled>
            <span className="spinner small"></span>
            <span>Нагуливаю...</span>
          </button>
        );
      case 'success':
        return (
          <button className="btn success" disabled>
            ✅ Готово!
          </button>
        );
      case 'error':
        return (
          <button className="btn error" disabled>
            ❌ Ошибка
          </button>
        );
      default:
        return (
          <button className="btn secondary" onClick={handleCookieImport}>
            <FontAwesomeIcon icon={faCookieBite} /> Нагулять куки
          </button>
        );
    }
  };

  return (
    <div className="account-card">
      <div className="account-card-header">
        <div className="account-avatar-section">
          <AvatarUploader
            accountId={account._id || account.id}
            avatarUrl={avatarUrl}
            className="account-avatar"
          />
          <h3 className="account-name">{account.name}</h3>
        </div>

        <div className="account-status">
          {renderStatus()}
        </div>
      </div>

      <div className="account-card-body">
        <div className="account-details">
          <p><strong>ID:</strong> {account._id || account.id}</p>
          {renderDolphinInfo()}
          {account.meta && account.meta.email && (
            <p><strong>Email:</strong> {account.meta.email}</p>
          )}
          {proxy && <p><strong>Proxy:</strong> {proxy}</p>}
          {account.proxyType && <p><strong>Proxy Type:</strong> {account.proxyType}</p>}
        </div>

        <div className="account-card-buttons">
          <div className="button-group">
            {!hasDolphinProfile && (
              <div className="action-button">
                {renderSyncButton()}
              </div>
            )}
            <div className="action-button">
              {renderCheckButton()}
            </div>
            {hasDolphinProfile && (
              <div className="action-button">
                {renderCookieButton()}
              </div>
            )}
            {hasAuthData && (
              <div className="action-button">
                {renderAuthButton()}
              </div>
            )}
            {render2FABadge()}
          </div>

          <div className="edit-delete-buttons">
            <button 
              className="edit-button" 
              onClick={() => onEdit(account)}
            >
              <FontAwesomeIcon icon={faPen} /> Изменить
            </button>
            <button 
              className="delete-button" 
              onClick={() => onDelete(account._id || account.id)}
            >
              <FontAwesomeIcon icon={faTrash} /> Удалить
            </button>
          </div>
        </div>
      </div>

      {show2FAModal && (
        <div className="modal">
          <div className="modal-content">
            <h2>Введите код 2FA</h2>
            <input 
              type="text" 
              placeholder="Код из Google Authenticator"
              onChange={(e) => setTwoFACode(e.target.value)}
            />
            <div className="modal-buttons">
              <button onClick={() => handle2FAVerify({ twoFactorCode: twoFACode })}>Подтвердить</button>
              <button onClick={() => setShow2FAModal(false)}>Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountCard;