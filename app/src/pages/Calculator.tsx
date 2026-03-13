import { useState } from 'react';
import { Calculator as CalculatorIcon, Scale, Activity, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Calculator() {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<'standard' | 'bmi' | 'calories'>('standard');

    return (
        <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="border-b border-white/5 pb-8">
                <h1 className="text-3xl sm:text-4xl font-extrabold premium-gradient-text tracking-tight uppercase">Gym Tools</h1>
                <p className="text-white/60 mt-2 text-sm sm:text-base font-bold tracking-wide uppercase opacity-100">Professional calculators for your daily needs.</p>
            </div>

            {/* Premium segmented control */}
            <div className="glass-card p-2 rounded-[2rem] w-full sm:w-fit relative border border-white/10 shadow-premium flex items-center gap-2 overflow-x-auto no-scrollbar">
                {['standard', 'bmi', 'calories'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        className={`
                            relative px-8 py-4 rounded-[1.5rem] font-black text-xs sm:text-sm transition-all duration-500 z-10
                            flex items-center gap-3 whitespace-nowrap overflow-hidden group
                            ${activeTab === tab ? 'text-white' : 'text-white/40 hover:text-white'}
                        `}
                    >
                        {activeTab === tab && (
                            <div className="absolute inset-0 bg-primary shadow-lg shadow-primary/30 animate-in zoom-in-95 duration-500"></div>
                        )}
                        <span className="relative z-10 flex items-center gap-3">
                            {tab === 'standard' && <CalculatorIcon className="w-5 h-5" />}
                            {tab === 'bmi' && <Scale className="w-5 h-5" />}
                            {tab === 'calories' && <Activity className="w-5 h-5" />}
                            <span className="uppercase tracking-[0.2em] text-[10px]">{tab}</span>
                        </span>
                    </button>
                ))}
            </div>

            {/* Main Content Area - Glass Card */}
            <div className="glass-card rounded-[3.5rem] p-12 shadow-premium border border-white/10 relative overflow-hidden min-h-[500px]">
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-[120px] pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/5 rounded-full blur-[120px] pointer-events-none"></div>

                <div className="relative z-10 h-full flex items-center justify-center">
                    {activeTab === 'standard' && <StandardCalculator />}
                    {activeTab === 'bmi' && <BMICalculator />}
                    {activeTab === 'calories' && <CalorieCalculator />}
                </div>
            </div>
        </div>
    );
}

function StandardCalculator() {
    const [display, setDisplay] = useState('0');
    const [equation, setEquation] = useState('');

    const handleNumber = (num: string) => {
        setDisplay(prev => prev === '0' ? num : prev + num);
        setEquation(prev => prev + num);
    };

    const handleOperator = (op: string) => {
        setDisplay('0');
        setEquation(prev => prev + ' ' + op + ' ');
    };

    const calculate = () => {
        try {
            // eslint-disable-next-line no-eval
            const result = eval(equation.replace('x', '*'));
            setDisplay(String(result));
            setEquation(String(result));
        } catch (e) {
            setDisplay('Error');
            setEquation('');
        }
    };

    const clear = () => {
        setDisplay('0');
        setEquation('');
    };

    // Button styles helper
    const btnBase = "h-20 rounded-[1.5rem] font-black text-2xl transition-all duration-300 active:scale-90 flex items-center justify-center border shadow-lg group";

    return (
        <div className="w-full max-w-sm mx-auto">
            {/* Screen */}
            <div className="mb-10 p-10 rounded-[2.5rem] bg-black/40 backdrop-blur-3xl shadow-premium border border-white/10 text-right group/screen">
                <div className="text-[10px] text-white/20 font-black uppercase tracking-[0.3em] min-h-[20px] mb-3 group-hover/screen:text-primary transition-colors duration-500 overflow-hidden truncate">{equation || 'Ready'}</div>
                <div className="text-5xl font-black text-white tracking-tighter overflow-hidden truncate">{display}</div>
            </div>

            {/* Keypad */}
            <div className="grid grid-cols-4 gap-4">
                <button
                    onClick={clear}
                    className={`${btnBase} col-span-2 bg-rose-500/10 border-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white hover:shadow-rose-500/20`}
                >
                    AC
                </button>
                <button
                    onClick={() => handleOperator('/')}
                    className={`${btnBase} bg-white/5 border-white/10 text-white/40 hover:text-white hover:bg-white/10 hover:border-white/20`}
                >
                    ÷
                </button>
                <button
                    onClick={() => handleOperator('*')}
                    className={`${btnBase} bg-white/5 border-white/10 text-white/40 hover:text-white hover:bg-white/10 hover:border-white/20`}
                >
                    ×
                </button>

                {['7', '8', '9'].map(n => (
                    <button
                        key={n}
                        onClick={() => handleNumber(n)}
                        className={`${btnBase} bg-white/5 border-white/5 text-white hover:bg-white/10 hover:scale-105`}
                    >
                        {n}
                    </button>
                ))}
                <button
                    onClick={() => handleOperator('-')}
                    className={`${btnBase} bg-white/5 border-white/10 text-white/40 hover:text-white hover:bg-white/10 hover:border-white/20`}
                >
                    -
                </button>

                {['4', '5', '6'].map(n => (
                    <button
                        key={n}
                        onClick={() => handleNumber(n)}
                        className={`${btnBase} bg-white/5 border-white/5 text-white hover:bg-white/10 hover:scale-105`}
                    >
                        {n}
                    </button>
                ))}
                <button
                    onClick={() => handleOperator('+')}
                    className={`${btnBase} bg-white/5 border-white/10 text-white/40 hover:text-white hover:bg-white/10 hover:border-white/20`}
                >
                    +
                </button>

                {['1', '2', '3'].map(n => (
                    <button
                        key={n}
                        onClick={() => handleNumber(n)}
                        className={`${btnBase} bg-white/5 border-white/5 text-white hover:bg-white/10 hover:scale-105`}
                    >
                        {n}
                    </button>
                ))}
                <button
                    onClick={calculate}
                    className={`${btnBase} row-span-2 bg-primary border-primary/20 text-white shadow-primary/30 hover:scale-105 active:scale-95`}
                >
                    =
                </button>

                <button
                    onClick={() => handleNumber('0')}
                    className={`${btnBase} col-span-2 bg-white/5 border-white/5 text-white hover:bg-white/10 hover:scale-[1.02]`}
                >
                    0
                </button>
                <button
                    onClick={() => handleNumber('.')}
                    className={`${btnBase} bg-white/5 border-white/5 text-white hover:bg-white/10`}
                >
                    .
                </button>
            </div>
        </div>
    );
}

function BMICalculator() {
    const [weight, setWeight] = useState('');
    const [height, setHeight] = useState('');
    const [bmi, setBmi] = useState<number | null>(null);

    const calculateBMI = () => {
        const h = parseFloat(height) / 100;
        const w = parseFloat(weight);
        if (h > 0 && w > 0) {
            setBmi(Math.round((w / (h * h)) * 10) / 10);
        }
    };

    const getCategory = (bmi: number) => {
        if (bmi < 18.5) return { label: 'Underweight', color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20' };
        if (bmi < 25) return { label: 'Normal weight', color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20' };
        if (bmi < 30) return { label: 'Overweight', color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/20' };
        return { label: 'Obese', color: 'text-rose-400', bg: 'bg-rose-400/10', border: 'border-rose-400/20' };
    };

    return (
        <div className="w-full max-w-lg mx-auto space-y-10">
            <div className="grid grid-cols-2 gap-8">
                <div className="space-y-3 group">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-4 group-focus-within:text-primary transition-colors">Weight (kg)</label>
                    <div className="relative">
                        <input
                            type="number"
                            value={weight}
                            onChange={e => setWeight(e.target.value)}
                            className="w-full text-center text-4xl font-black p-8 rounded-[2.5rem] outline-none transition-all border border-white/10 bg-white/5 focus:bg-white/10 focus:border-primary/50 text-white placeholder-white/10 focus:ring-8 focus:ring-primary/5 shadow-inner"
                            placeholder="0"
                        />
                    </div>
                </div>
                <div className="space-y-3 group">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-4 group-focus-within:text-primary transition-colors">Height (cm)</label>
                    <div className="relative">
                        <input
                            type="number"
                            value={height}
                            onChange={e => setHeight(e.target.value)}
                            className="w-full text-center text-4xl font-black p-8 rounded-[2.5rem] outline-none transition-all border border-white/10 bg-white/5 focus:bg-white/10 focus:border-primary/50 text-white placeholder-white/10 focus:ring-8 focus:ring-primary/5 shadow-inner"
                            placeholder="0"
                        />
                    </div>
                </div>
            </div>

            <button
                onClick={calculateBMI}
                className="w-full py-6 rounded-[2rem] font-black uppercase tracking-[0.3em] text-sm shadow-premium bg-primary text-white transition-all hover:scale-105 active:scale-95 hover:shadow-primary/30 group relative overflow-hidden"
            >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                <span className="relative z-10">Calculate BMI</span>
            </button>

            {bmi && (
                <div className="p-12 rounded-[3.5rem] text-center space-y-4 animate-in zoom-in-95 duration-700 bg-white/5 border border-white/10 shadow-premium relative overflow-hidden group">
                    <div className={`absolute inset-0 opacity-10 blur-3xl ${getCategory(bmi).bg}`}></div>
                    <div className="relative z-10">
                        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 mb-2">Your Result</div>
                        <div className="text-7xl font-black py-4 text-white tracking-tighter scale-110">{bmi}</div>
                        <div className={`mt-4 px-8 py-3 rounded-full text-xs font-black uppercase tracking-[0.2em] inline-block border ${getCategory(bmi).color} ${getCategory(bmi).bg} ${getCategory(bmi).border} shadow-lg shadow-black/20`}>
                            {getCategory(bmi).label}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function CalorieCalculator() {
    const [data, setData] = useState({
        gender: 'male',
        age: '',
        weight: '',
        height: '',
        activity: '1.2'
    });
    const [result, setResult] = useState<number | null>(null);

    const calculateCalories = () => {
        const w = parseFloat(data.weight);
        const h = parseFloat(data.height);
        const a = parseFloat(data.age);

        if (!w || !h || !a) return;

        let bmr = (10 * w) + (6.25 * h) - (5 * a);
        bmr += data.gender === 'male' ? 5 : -161;

        setResult(Math.round(bmr * parseFloat(data.activity)));
    };

    return (
        <div className="w-full max-w-xl mx-auto space-y-10">
            <div className="grid grid-cols-2 gap-8">
                <div className="col-span-2 grid grid-cols-2 gap-4 p-2 rounded-[2rem] border border-white/10 bg-white/5">
                    {['male', 'female'].map(g => (
                        <button
                            key={g}
                            onClick={() => setData({ ...data, gender: g })}
                            className={`py-4 rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] transition-all duration-500 relative overflow-hidden group ${data.gender === g ? 'text-white' : 'text-white/30 hover:text-white/60'}`}
                        >
                            {data.gender === g && (
                                <div className="absolute inset-0 bg-primary/20 animate-in fade-in duration-500"></div>
                            )}
                            <span className="relative z-10">{g}</span>
                        </button>
                    ))}
                </div>

                {['Age', 'Weight (kg)', 'Height (cm)'].map((label, i) => {
                    const field = label.toLowerCase().split(' ')[0] as keyof typeof data;
                    return (
                        <div key={label} className="space-y-3 group">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-4 group-focus-within:text-primary transition-colors">{label}</label>
                            <input
                                type="number"
                                value={data[field]}
                                onChange={e => setData({ ...data, [field]: e.target.value })}
                                className="w-full p-6 rounded-2xl outline-none transition-all border border-white/10 bg-white/5 focus:bg-white/10 focus:border-primary/50 text-white placeholder-white/10 font-bold"
                            />
                        </div>
                    );
                })}

                <div className="space-y-3 group col-span-1">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-4 group-focus-within:text-primary transition-colors">Activity Level</label>
                    <div className="relative">
                        <select
                            value={data.activity}
                            onChange={e => setData({ ...data, activity: e.target.value })}
                            className="w-full p-6 rounded-2xl outline-none transition-all border border-white/10 bg-white/5 focus:bg-white/10 focus:border-primary/50 text-white appearance-none font-bold cursor-pointer pr-16"
                        >
                            <option className="bg-slate-900" value="1.2">Sedentary</option>
                            <option className="bg-slate-900" value="1.375">Lightly Active</option>
                            <option className="bg-slate-900" value="1.55">Moderately Active</option>
                            <option className="bg-slate-900" value="1.725">Very Active</option>
                            <option className="bg-slate-900" value="1.9">Extra Active</option>
                        </select>
                        <div className="absolute inset-y-0 right-6 flex items-center pointer-events-none opacity-40 group-hover:opacity-100 transition-opacity">
                            <ChevronDown className="w-5 h-5 text-white" />
                        </div>
                    </div>
                </div>
            </div>

            <button
                onClick={calculateCalories}
                className="w-full py-6 rounded-[2rem] font-black uppercase tracking-[0.3em] text-sm shadow-premium bg-primary text-white transition-all hover:scale-105 active:scale-95 hover:shadow-primary/30 group relative overflow-hidden"
            >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                <span className="relative z-10">Calculate Daily Calories</span>
            </button>

            {result && (
                <div className="p-10 rounded-[3.5rem] text-center space-y-4 animate-in zoom-in-95 duration-700 bg-white/5 border border-white/10 shadow-premium relative overflow-hidden">
                    <div className="absolute inset-0 bg-primary/5 opacity-50 blur-3xl"></div>
                    <div className="relative z-10">
                        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 mb-2">Maintenance Calories</div>
                        <div className="text-6xl font-black py-4 text-white tracking-tighter">
                            {result} <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/50 block mt-2">kcal per day</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
