import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useI18n } from '@/lib/i18n/I18nContext';
import { submitRecipe } from '@/lib/services/api';
import { RECIPE_CATEGORIES } from '@/lib/services/recipeService';

type Step = 'info' | 'wicIngredients' | 'otherIngredients' | 'instructions' | 'review';

const STEPS: Step[] = ['info', 'wicIngredients', 'otherIngredients', 'instructions', 'review'];

const DIFFICULTY_OPTIONS = ['easy', 'medium', 'hard'];

export default function AddRecipeScreen() {
  const router = useRouter();
  const { t } = useI18n();

  const [currentStep, setCurrentStep] = useState<Step>('info');

  // Form state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('dinner');
  const [prepTime, setPrepTime] = useState('');
  const [servings, setServings] = useState('');
  const [difficulty, setDifficulty] = useState('easy');
  const [wicIngredients, setWicIngredients] = useState<string[]>(['']);
  const [nonWicIngredients, setNonWicIngredients] = useState<string[]>(['']);
  const [instructions, setInstructions] = useState<string[]>(['']);
  const [submitting, setSubmitting] = useState(false);

  const stepIndex = STEPS.indexOf(currentStep);

  const addItem = (
    list: string[],
    setter: (v: string[]) => void
  ) => {
    setter([...list, '']);
  };

  const updateItem = (
    list: string[],
    setter: (v: string[]) => void,
    index: number,
    value: string
  ) => {
    const updated = [...list];
    updated[index] = value;
    setter(updated);
  };

  const removeItem = (
    list: string[],
    setter: (v: string[]) => void,
    index: number
  ) => {
    if (list.length <= 1) return;
    setter(list.filter((_, i) => i !== index));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 'info':
        return title.trim() && prepTime && servings;
      case 'wicIngredients':
        return wicIngredients.some((i) => i.trim());
      case 'otherIngredients':
        return true; // optional
      case 'instructions':
        return instructions.some((i) => i.trim());
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (stepIndex < STEPS.length - 1) {
      setCurrentStep(STEPS[stepIndex + 1]);
    }
  };

  const handleBack = () => {
    if (stepIndex > 0) {
      setCurrentStep(STEPS[stepIndex - 1]);
    }
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      await submitRecipe({
        title: title.trim(),
        category,
        prepTime: parseInt(prepTime),
        servings: parseInt(servings),
        difficulty,
        wicIngredients: wicIngredients.filter((i) => i.trim()),
        nonWicIngredients: nonWicIngredients.filter((i) => i.trim()),
        instructions: instructions.filter((i) => i.trim()),
      });
      Alert.alert(
        t('addRecipe.successTitle'),
        t('addRecipe.successMessage'),
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      Alert.alert(t('addRecipe.errorTitle'), t('addRecipe.errorMessage'));
    } finally {
      setSubmitting(false);
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {STEPS.map((step, idx) => (
        <View
          key={step}
          style={[
            styles.stepDot,
            idx <= stepIndex && styles.stepDotActive,
          ]}
        />
      ))}
    </View>
  );

  const renderInfoStep = () => (
    <View>
      <Text style={styles.fieldLabel}>{t('addRecipe.recipeTitle')}</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder={t('addRecipe.titlePlaceholder')}
        placeholderTextColor="#999"
      />

      <Text style={styles.fieldLabel}>{t('addRecipe.category')}</Text>
      <View style={styles.optionRow}>
        {RECIPE_CATEGORIES.filter((c) => c.id !== 'all').map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[styles.optionChip, category === cat.id && styles.optionChipActive]}
            onPress={() => setCategory(cat.id)}
          >
            <Text style={[styles.optionChipText, category === cat.id && styles.optionChipTextActive]}>
              {cat.icon} {t(cat.labelKey)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.row}>
        <View style={styles.halfField}>
          <Text style={styles.fieldLabel}>{t('addRecipe.prepTime')}</Text>
          <TextInput
            style={styles.input}
            value={prepTime}
            onChangeText={setPrepTime}
            placeholder="30"
            placeholderTextColor="#999"
            keyboardType="numeric"
          />
        </View>
        <View style={styles.halfField}>
          <Text style={styles.fieldLabel}>{t('addRecipe.servings')}</Text>
          <TextInput
            style={styles.input}
            value={servings}
            onChangeText={setServings}
            placeholder="4"
            placeholderTextColor="#999"
            keyboardType="numeric"
          />
        </View>
      </View>

      <Text style={styles.fieldLabel}>{t('addRecipe.difficulty')}</Text>
      <View style={styles.optionRow}>
        {DIFFICULTY_OPTIONS.map((d) => (
          <TouchableOpacity
            key={d}
            style={[styles.optionChip, difficulty === d && styles.optionChipActive]}
            onPress={() => setDifficulty(d)}
          >
            <Text style={[styles.optionChipText, difficulty === d && styles.optionChipTextActive]}>
              {t(`recipes.difficulty.${d}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderListStep = (
    label: string,
    items: string[],
    setter: (v: string[]) => void,
    placeholder: string
  ) => (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      {items.map((item, idx) => (
        <View key={idx} style={styles.listItemRow}>
          <TextInput
            style={[styles.input, styles.listInput]}
            value={item}
            onChangeText={(v) => updateItem(items, setter, idx, v)}
            placeholder={placeholder}
            placeholderTextColor="#999"
          />
          {items.length > 1 && (
            <TouchableOpacity
              style={styles.removeBtn}
              onPress={() => removeItem(items, setter, idx)}
            >
              <Text style={styles.removeBtnText}>{'\u2715'}</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
      <TouchableOpacity style={styles.addBtn} onPress={() => addItem(items, setter)}>
        <Text style={styles.addBtnText}>+ {t('addRecipe.addAnother')}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderReview = () => {
    const filteredWic = wicIngredients.filter((i) => i.trim());
    const filteredOther = nonWicIngredients.filter((i) => i.trim());
    const filteredSteps = instructions.filter((i) => i.trim());

    return (
      <View>
        <Text style={styles.reviewTitle}>{title}</Text>
        <Text style={styles.reviewMeta}>
          {category} | {prepTime} min | {servings} servings | {difficulty}
        </Text>

        <Text style={styles.reviewSection}>{t('recipes.wicIngredientsTitle')}</Text>
        {filteredWic.map((i, idx) => (
          <Text key={idx} style={styles.reviewItem}>  {'\u2022'} {i}</Text>
        ))}

        {filteredOther.length > 0 && (
          <>
            <Text style={styles.reviewSection}>{t('recipes.otherIngredients')}</Text>
            {filteredOther.map((i, idx) => (
              <Text key={idx} style={styles.reviewItem}>  {'\u2022'} {i}</Text>
            ))}
          </>
        )}

        <Text style={styles.reviewSection}>{t('recipes.instructions')}</Text>
        {filteredSteps.map((s, idx) => (
          <Text key={idx} style={styles.reviewItem}>  {idx + 1}. {s}</Text>
        ))}
      </View>
    );
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'info':
        return renderInfoStep();
      case 'wicIngredients':
        return renderListStep(
          t('recipes.wicIngredientsTitle'),
          wicIngredients,
          setWicIngredients,
          t('addRecipe.ingredientPlaceholder')
        );
      case 'otherIngredients':
        return renderListStep(
          t('recipes.otherIngredients'),
          nonWicIngredients,
          setNonWicIngredients,
          t('addRecipe.ingredientPlaceholder')
        );
      case 'instructions':
        return renderListStep(
          t('recipes.instructions'),
          instructions,
          setInstructions,
          t('addRecipe.stepPlaceholder')
        );
      case 'review':
        return renderReview();
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        {renderStepIndicator()}

        <Text style={styles.stepTitle}>
          {t(`addRecipe.steps.${currentStep}`)}
        </Text>

        {renderCurrentStep()}
      </ScrollView>

      {/* Navigation */}
      <View style={styles.navRow}>
        {stepIndex > 0 ? (
          <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
            <Text style={styles.backBtnText}>{t('addRecipe.back')}</Text>
          </TouchableOpacity>
        ) : (
          <View />
        )}

        {currentStep === 'review' ? (
          <TouchableOpacity
            style={[styles.nextBtn, submitting && styles.nextBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <Text style={styles.nextBtnText}>
              {submitting ? t('addRecipe.submitting') : t('addRecipe.submit')}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.nextBtn, !canProceed() && styles.nextBtnDisabled]}
            onPress={handleNext}
            disabled={!canProceed()}
          >
            <Text style={styles.nextBtnText}>{t('addRecipe.next')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16, paddingBottom: 100 },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E0E0E0',
  },
  stepDotActive: {
    backgroundColor: '#FF9800',
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfField: {
    flex: 1,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  optionChipActive: {
    backgroundColor: '#FF9800',
  },
  optionChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666',
  },
  optionChipTextActive: {
    color: '#fff',
  },
  listItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  listInput: {
    flex: 1,
  },
  removeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFEBEE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtnText: {
    fontSize: 14,
    color: '#F44336',
    fontWeight: '600',
  },
  addBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  addBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF9800',
  },
  reviewTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  reviewMeta: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  reviewSection: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  reviewItem: {
    fontSize: 14,
    color: '#555',
    lineHeight: 22,
  },
  navRow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  backBtn: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },
  backBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  nextBtn: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    backgroundColor: '#FF9800',
  },
  nextBtnDisabled: {
    backgroundColor: '#E0E0E0',
  },
  nextBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
